---
status: completed
title: Pedidos, controles e reinício no serviço
type: backend
complexity: high
---

# Task 05: Pedidos, controles e reinício no serviço

## Visão geral
Esta tarefa completa o `tick()` do serviço de sessões:
- cada `canUseTool` vira um pedido que espera a resposta da web;
- as mensagens na fila são entregues;
- os pedidos de interromper e de encerrar são aplicados;
- sessões órfãs de um reinício ficam "Interrompida" e são retomadas com a próxima mensagem da pessoa.

<critical>
- LEIA a spec (`docs/specs/sessao-no-flow-dev/spec.md`, §6 "Pedidos", "Interromper e encerrar" e "Reinício", §7.2 e §16) e `v20-spike.md`, e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-065: as respostas chegam ao Claude, e o pedido guarda a resposta dada.
- REQ-068, B-27: um pedido pendente espera sem prazo, inclusive com a web fora do ar.
- REQ-069, REQ-071, REQ-072: nos modos que perguntam, o pedido de aprovação vira uma linha com o resumo da 7.10 e a regra sugerida; "Permitir sempre" leva a sugestão com `localSettings`; em "Tudo liberado", nenhuma aprovação vira pedido.
- REQ-057, NFR-10: uma mensagem ou resposta gravada chega ao runtime no ciclo seguinte (≤ 1 s), dentro dos 2 s da NFR-10.
- REQ-058, REQ-059: as mensagens na fila são entregues em ordem, exatamente como gravadas, e marcadas com `delivered_at`.
- REQ-073, B-30: interromper chama `interrupt()`, cancela os pendentes, grava "Interrompido por você" e leva a `waiting`; sem vez ativa, não faz nada.
- REQ-074: encerrar chama `close()`, cancela os pendentes, roda a captura de artefatos da Spec B e leva a `ended`.
- REQ-076, NFR-11: ao subir com um `worker_id` novo, as sessões não finais do `host_id` com outro `worker_id` vão para `interrupted`, com a nota `system` "Sessão interrompida às HH:MM. Envie uma mensagem para retomar." e os pedidos `cancelled`, no primeiro `tick()`. O mesmo vale para um `onExit(crashed)`.
- REQ-077, B-23: uma mensagem numa sessão `interrupted` aciona `runtime.resume` com `claude_session_id` e entra como `firstMessage`.
- REQ-078: sem `claude_session_id`, ou com falha no `resume`, a sessão vai para `ended` (`end_reason = resume_failed`), com a nota "Não foi possível retomar a conversa. Abra uma nova sessão.", e a mensagem fica `undelivered`.
- REQ-079: nenhuma retomada sem mensagem.

## Interfaces
- **Consome:** `SessionSupervisor`, `ClaudeSessionRuntime`, `RuntimeHandle`, `mapAnswerToPermissionResult` e `ScriptedSessionRuntime` (task_04); `SessionRequestDao`, `SessionMessageDao`, `SessionControlDao` e `applySessionSignal` (task_02); `summarizePermissionRequest` (task_02); `ArtifactCaptureService` da Spec B (`application/services/terminal/artifactCaptureService.ts`).
- **Produz:** `SessionRequestBroker` (o `onPermission` dos handlers) e os passos `deliverMessages`, `resolveAnswers`, `applyControls`, `recoverOrphans` e `resumeInterrupted`, todos ligados ao `tick()` do `SessionSupervisor`.

## Mini-tarefas

- [x] **05.1 — Broker de pedidos**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionRequestBroker.ts`, `pendingRequestRegistry.ts` e `answerDispatch.ts` (criar), `sessionSupervisor.ts` (ligar `resolveAnswers` ao `tick()`), `packages/api/test/session-requests.test.ts` (criar)
  - **Testes:** V-24c, V-24d, V-24e, V-24f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-requests.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **05.2 — Mensagens, interromper e encerrar**
  - **Arquivos:** `packages/api/src/application/services/terminal/messageDelivery.ts` e `sessionControls.ts` (criar), `sessionSupervisor.ts` (ligar ao `tick()`), `packages/api/test/session-controls.test.ts` (criar)
  - **Testes:** V-24j, V-25a, V-25b, V-25c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-controls.test.ts` passa
- [x] **05.3 — Órfãs, crash e retomada**
  - **Arquivos:** `packages/api/src/application/services/terminal/orphanRecovery.ts` e `sessionResume.ts` (criar), `sessionSupervisor.ts` (`recoverOrphans` no primeiro `tick()`, `onExit(crashed)`, `resumeInterrupted`), `packages/api/test/session-recovery.test.ts` (criar)
  - **Testes:** V-26a, V-26b, V-26c, V-26d, V-26e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-recovery.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- **Broker:** `onPermission` recebe `{ toolName, input, toolUseId, suggestions }`.
  - Em "Tudo liberado" no plano B do spike: libera na hora tudo que não for `AskUserQuestion`.
  - Nos demais casos:
    1. grava o pedido (`kind = question` para `AskUserQuestion`, senão `permission`, com o resumo de `summarizePermissionRequest` e a primeira sugestão como `suggestedRule`);
    2. aplica `request_opened`;
    3. guarda o `resolve` no `pendingRequestRegistry` pelo id do pedido;
    4. devolve a promessa.
- `resolveAnswers` busca os pedidos `answered` cujo id está no registry, resolve cada um com `mapAnswerToPermissionResult` e, sem pendentes na sessão, aplica `requests_settled`.
- Cancelar um pedido (interromper, encerrar, órfã) resolve a promessa com `deny` "Interrompido pela pessoa" e grava `cancelled`. Uma órfã já não tem promessa, então só grava.
- A nota de horário usa o fuso `America/Sao_Paulo` no formato HH:MM, como as outras mensagens da Spec B.
- O encerramento reaproveita o caminho do `SessionEnd` da Spec B, que agenda a captura. Aqui a captura roda direto no serviço, sem `after()`.

### Arquivos relevantes
- `packages/api/src/application/services/terminal/terminalEventIngestion.ts` e `artifactCaptureService.ts`: o que o `SessionEnd` dispara.
- `packages/api/test/artifact-capture-support.ts`: clone temporário com `.md` para o V-25c.
- `packages/api/test/session-worker-support.ts` (task_04): supervisor com runtime roteirizado e relógio controlado.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-17 (spec §17): tudo passa pelo banco; a promessa em memória só existe enquanto o processo vive.
- DEC-20: o comportamento de "Tudo liberado" depende do plano registrado no spike.

## Premissas
- P-11 confirmada no V-20f. Se o spike mostrou que o `resume` não retoma no meio de uma ferramenta, a REQ-078 continua valendo para o caso que falhar.

## Testes atribuídos
- [x] V-24c: roteiro com `ask` (2 perguntas) → uma linha `question` `pending` com as perguntas e a sessão em `asking`; gravar a resposta com `answerIfPending` → no `tick()` seguinte, o runtime recebe `allow` com `updatedInput.answers` iguais às gravadas, o roteiro segue, e a sessão volta a `running` · supervisor + Postgres + runtime roteirizado
- [x] V-24d: sessão `accept_edits`, roteiro com `permission` de Bash `pnpm test` e a sugestão `Bash(pnpm test:*)` → linha `permission` com o título "Rodar comando:" e `suggestedRule = "Bash(pnpm test:*)"`; responder `allow_always` → o runtime recebe `updatedPermissions` com `destination: "localSettings"` · supervisor + Postgres + runtime roteirizado
- [x] V-24e: sessão `bypass`, roteiro com `permission` de Bash → nenhuma linha `permission`, e o roteiro segue (REQ-072); com `ask` na mesma sessão → a pergunta vira pedido · supervisor + Postgres + runtime roteirizado
- [x] V-24f: pedido pendente e 50 `tick()` sem resposta (relógio avançando 30 min) → o pedido continua `pending`, a promessa não resolve, e a sessão continua `asking` (REQ-068, B-27) · supervisor + Postgres + runtime roteirizado
- [x] V-24j: sessão `running` e duas mensagens gravadas na fila ("A" e depois "B") → o runtime recebe "A" e depois "B", exatamente como gravadas, e as duas ganham `delivered_at` no mesmo `tick()` · supervisor + Postgres + runtime roteirizado
- [x] V-25a: sessão `asking` com um pedido pendente e `interrupt_requested_at` → `handle.interrupt()` chamado uma vez, o pedido fica `cancelled` e a promessa resolve com `deny`, a sessão vai a `waiting`, há uma nota "Interrompido por você", e `interrupt_requested_at` é limpo · supervisor + Postgres + runtime roteirizado
- [x] V-25b: sessão `waiting` (sem vez ativa) com `interrupt_requested_at` → status e mensagens inalterados, sem erro, e a flag limpa (B-30) · supervisor + Postgres + runtime roteirizado
- [x] V-25c: sessão com um `file_edit` de `docs/specs/x/spec.md` sob skill ativa e `end_requested_at` → `handle.close()` chamado, a sessão vai a `ended`, e `task_artifact_versions` ganha a versão com o conteúdo do arquivo do clone temporário · supervisor + Postgres + roteiro + clone temporário
- [x] V-26a: sessão `asking` com `worker_id = w1` e um pedido pendente; um supervisor novo `w2` com o mesmo `host_id` roda o primeiro `tick()` → sessão `interrupted`, pedido `cancelled`, e uma mensagem `system` "Sessão interrompida às 14:32. Envie uma mensagem para retomar." com o relógio em 14:32 · supervisor + Postgres, relógio controlado
- [x] V-26b: roteiro que termina com `onExit({ kind: "crashed" })` no meio da vez → sessão `interrupted`, com a mesma nota · supervisor + Postgres + runtime roteirizado
- [x] V-26c: sessão `interrupted` com `claude_session_id = abc` e uma mensagem na fila "Pode seguir" → `runtime.resume` chamado com `claudeSessionId: "abc"` e `firstMessage: "Pode seguir"`; a mensagem ganha `delivered_at`, e a sessão vai a `running` (B-23) · supervisor + Postgres + runtime roteirizado
- [x] V-26d: sessão `interrupted` sem `claude_session_id` e uma mensagem na fila → nenhuma chamada ao runtime, a sessão vai a `ended` com `end_reason = resume_failed` e a nota "Não foi possível retomar a conversa. Abra uma nova sessão.", e a mensagem fica `undelivered = true`; o mesmo quando `resume` lança · supervisor + Postgres + runtime roteirizado
- [x] V-26e: sessão `interrupted` sem mensagem na fila e 10 `tick()` → `runtime.resume` nunca chamado (REQ-079) · supervisor + Postgres + runtime roteirizado

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando ao fim da tarefa.
- `pnpm --dir packages/api typecheck` e `pnpm --dir packages/api lint` sem erros; `sessionSupervisor.ts` dentro de 100 linhas, com os passos em arquivos próprios.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->

### 2026-11-23 — 05.1 Broker de pedidos
- `SessionRequestBroker` (`onPermission` dos handlers): em `bypass`, tudo que não é `AskUserQuestion` segue sem pedido (REQ-072; com o plano A do spike o SDK nem chama o callback nesse caso, é só uma defesa). Nos outros casos grava a linha (`question` com as perguntas; `permission` com o resumo da 7.10, a regra sugerida no formato do arquivo de configurações, como `Bash(pnpm test:*)`, e as sugestões originais), aplica `request_opened` e guarda o `resolve` no `PendingRequestRegistry`, sem prazo. Falha ao gravar o pedido devolve `deny` com "Não foi possível registrar o pedido." em vez de derrubar o runtime.
- `AnswerDispatchStep` (`resolveAnswers`): resolve as respostas gravadas com `mapAnswerToPermissionResult` e, sem pedidos pendentes na sessão, aplica `requests_settled`. `RequestCancellation` cancela os pendentes no banco e nega as promessas com "Interrompido pela pessoa"; é reaproveitado pelos controles, pelas órfãs e pela queda do processo.
- Para as transições do serviço criei `SessionStatusDao` (`transition` com `FOR UPDATE`, `controlRequests`, `markEnded`, `listInterrupted`, `claimResume`), porque as operações da 02 não cobriam a troca de estado.
- Ajuste que o teste revelou: o `onPermission` da fábrica de handlers espera a fila de gravação esvaziar antes de abrir o pedido. Sem isso, o `request_opened` podia chegar antes do `SessionStart` ser gravado, e a sessão ficava em "Em andamento" com um pedido aberto.
- `InflightTracker` + `worker.idle()` deixam os testes esperarem o trabalho do broker sem sleeps.
- `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-requests.test.ts`: 6 testes passam (V-24c, V-24d com `allow_always` e com recusa e motivo, V-24e, V-24f e dois pedidos na mesma sessão).

### 2026-11-23 — 05.2 Mensagens, interromper e encerrar
- `MessageDeliveryStep`: entrega em ordem, exatamente como gravadas, e marca `delivered_at` no mesmo tick. `SessionControlsStep`: interromper (só age com a vez em andamento, ou seja `running` ou `asking`; chama `interrupt()`, cancela e nega os pedidos, grava "Interrompido por você" e leva a `waiting`; em outro estado só limpa a flag, B-30) e encerrar (cancela os pedidos, `close()`, espera a fila de gravação, `markEnded` como reserva e limpa a flag). A captura de artefatos do encerramento sai pelo `SessionEnd` que o runtime sintetiza: o recorder chama a captura direto, sem `after()`.
- `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-controls.test.ts test/session-delivery.test.ts`: 6 testes passam (V-24j, V-25a, V-25b, V-25c com a versão capturada do `spec.md` do clone temporário e `trigger = session_end`, e o cancelamento ao encerrar). O teste da 05.2 ficou em dois arquivos por causa das 100 linhas.

### 2026-11-23 — 05.3 Órfãs, crash e retomada
- `OrphanRecoveryStep` (primeiro tick; só marca como feito depois de sucesso), `SessionExitHandling` (`crashed` leva a `interrupted` com a nota, cancela os pedidos e solta o handle) e `SessionResumeStep`: uma sessão `interrupted` com mensagem na fila é assumida com `UPDATE … WHERE status = 'interrupted'` (uma só vez), vai a `running` e chama `runtime.resume` com o `claude_session_id` e a mensagem como `firstMessage`; sem mensagem, nada acontece (REQ-079). Sem `claude_session_id`, ou com `resume` que lança ou que falha ao subir, a sessão vai a `ended` com `end_reason = resume_failed`, a nota "Não foi possível retomar a conversa. Abra uma nova sessão." e as mensagens como "Não entregue". A nota de horário usa `America/Sao_Paulo`; o relógio dos testes é 17:32 UTC, que dá 14:32.
- `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-recovery.test.ts test/session-resume.test.ts`: 8 testes passam (V-26a duas vezes, V-26b, V-26c, V-26d três vezes, V-26e). Mutação conferida: retomar sem mensagem faz o V-26a e o V-26e falharem. Dois arquivos, por causa das 100 linhas.

### 2026-11-23 — Fechamento da tarefa
- `pnpm --dir packages/api typecheck`: sem erros. `pnpm --dir packages/api test`: 98 arquivos, 652 testes passam. `pnpm --dir packages/api test:integration`: 109 arquivos, 616 testes passam. `sessionSupervisor.ts` tem 23 linhas, e cada passo mora no seu arquivo. Nenhum arquivo novo passa de 100 linhas.

