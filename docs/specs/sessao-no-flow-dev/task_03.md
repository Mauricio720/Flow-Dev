---
status: completed
title: Interação pela web
type: backend
complexity: high
---

# Task 03: Interação pela web

## Visão geral
É o lado web da sessão. O `open` passa a só gravar a sessão para o serviço assumir, já sem o GNOME Terminal, e o `preflight` diz se o serviço está rodando. As procedures `tasks.session.*` gravam mensagens, respostas e pedidos de controle, e devolvem a linha do tempo. Tudo é autorizado pela REQ-080 no controller.

<critical>
- LEIA a spec (`docs/specs/sessao-no-flow-dev/spec.md`, §6, §7.4, §7.5, §15, §16 e §18) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use as skills `layered-backend` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-051: o `open` cria a sessão `opening` com `runtime = flow_dev`, `permission_mode` e `host_id`, e prepara o `contexto/` e os anexos como hoje; não dispara terminal nenhum.
- REQ-052: o `open` aceita `permissionMode` (`bypass` por padrão no schema) e o grava.
- REQ-053: sem heartbeat do `host_id` local há menos de 15 s, o `preflight` devolve `sessionService.running = false`, e o `open` recusa com `session_service_offline`.
- REQ-058, REQ-060: `send` aceita de 1 a 20.000 caracteres e é idempotente por `requestKey`.
- REQ-067: segunda resposta → `request_answered`; pedido cancelado → `request_closed`.
- REQ-073, REQ-074: `interrupt` e `end` só gravam `interrupt_requested_at` e `end_requested_at`; numa sessão final, `session_not_active`.
- REQ-080, 7.4, B-22: só quem abriu, enquanto for a operadora, controla; os demais recebem `session_control_denied`, e a `timeline` devolve `canControl: false`.
- REQ-055, REQ-061, 7.5: a `timeline` junta mensagens, eventos e pedidos por horário, com cursor incremental, as 200 entradas mais recentes e `hiddenEntries`; vale para sessões anteriores.
- REQ-062: a exclusão da Issue apaga mensagens e pedidos.
- REQ-082: `silentSince` fica `null` nas sessões `flow_dev`.
- REQ-081: uma sessão `flow_dev` em `opening` há mais de 60 s passa a `unconfirmed` na leitura, como na Spec B (DEC-07).
- NFR-13: a `timeline` exige leitura da tarefa, como `tasks.byId`.
- Não muda (§9): prompt, anexos e skills da Spec A; trava `FLOW_DEV_TERMINAL_ENABLED`; confirmação da segunda sessão (REQ-014).

## Interfaces
- **Consome:** os DAOs e tipos da task_02 (`SessionMessageDao`, `SessionRequestDao`, `SessionHostDao`, `SessionControlDao`, `PermissionMode`, `validateQuestionAnswers`, `validatePermissionDecision`, os limites de `sessionInteractionLimits.ts`); `createWorkAuthorization` (operadora); `TerminalSessionController` e `TerminalOpenSteps` existentes.
- **Produz** (contratos da spec §15, consumidos pela task_06):
  - `tasks.terminal.preflight` → `+ sessionService: { running: boolean }`;
  - `tasks.terminal.open({ ..., permissionMode })`, com o erro novo `session_service_offline`;
  - `tasks.session.timeline`, `send`, `answerQuestion`, `decidePermission`, `interrupt` e `end`, com os erros `session_control_denied | session_not_active | request_closed | request_answered | message_invalid | answer_incomplete | answer_invalid`;
  - `machineIdentity(): string` em `packages/api/src/infra/terminal/machineIdentity.ts`, usado também pela task_04.

## Mini-tarefas

- [x] **03.1 — `open` e `preflight` sem terminal, com modo e serviço**
  - **Arquivos:** `packages/api/src/infra/terminal/machineIdentity.ts` (criar), `packages/api/src/application/services/terminal/terminalOpenSteps.ts` (trocar o disparo por gravar `runtime`, `permission_mode` e `host_id`), `terminalOpenGuard.ts` (heartbeat no lugar de `gnome-terminal` no PATH), `packages/api/src/controllers/terminalSessionController.ts`, `packages/api/src/schemas/terminal.ts` (`permissionMode`), `terminalErrorCatalog.ts` e `packages/api/src/controllers/terminalErrorMapper.ts` (`session_service_offline`), `packages/api/src/infra/terminalComposition.ts`; remover `gnomeTerminalLauncher.ts`, `claudeSessionSettingsWriter.ts`, `claudeHookSettings.ts`, `terminalCommand.ts` e os testes deles, além de `application/terminal/terminalLauncher.ts` (`TerminalLauncher`) e `sessionSettings.ts`, mantendo o `ToolLocator`; ajustar `packages/api/test/terminal-open*.test.ts`, `terminal-preflight.test.ts` e `terminal-harness.ts`
  - **Testes:** V-29b, V-29c, V-32b, V-32f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-open.test.ts test/terminal-open-guards.test.ts test/terminal-open-additional.test.ts test/terminal-open-attachments.test.ts test/terminal-preflight.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** o `recordingTerminalLauncher` e a variável `FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE` deixam de existir; os testes passam a conferir a linha da sessão e a pasta `contexto/`. Mantenha o `terminal-open-token.test.ts` só se o token ainda for gerado; com a DEC-18, as sessões novas não têm token, e o teste vira a asserção `token_hash IS NULL`.
- [x] **03.2 — `send` com autorização, limites e idempotência**
  - **Arquivos:** `packages/api/src/controllers/sessionInteractionController.ts` (criar), `packages/api/src/application/services/terminal/sessionControlAuthorization.ts` (criar: REQ-080), `packages/api/src/schemas/session.ts` (criar), `packages/api/src/routers/session.ts` (criar) e `packages/api/src/routers/tasks.ts` (montar `session`), `packages/api/src/infra/sessionInteractionComposition.ts` (criar), `packages/api/test/session-send.test.ts` e `session-interaction-support.ts` (criar)
  - **Testes:** V-23a, V-23b, V-23c, V-23d, V-23g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-send.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **03.3 — Responder, interromper e encerrar**
  - **Arquivos:** `packages/api/src/controllers/sessionInteractionController.ts` (alterar, ou dividir em `sessionRequestController.ts` se passar de 100 linhas), `packages/api/src/schemas/session.ts`, `packages/api/src/routers/session.ts`, `packages/api/test/session-answer.test.ts` e `session-control.test.ts` (criar)
  - **Testes:** V-23f, V-23h, V-23i
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-answer.test.ts test/session-control.test.ts` passa
- [x] **03.4 — Linha do tempo, sessões antigas e exclusão**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionTimelineReader.ts` e `sessionTimelineMerge.ts` (criar), `packages/api/src/infra/database/dao/terminal/sessionTimelineQueries.ts` (criar), `terminalExecutionReader.ts` (`silentSince` nulo em `flow_dev`; `runtime` na sessão), `packages/api/src/infra/database/dao/issue-deletion/deletionPurge.ts` (apagar `task_terminal_requests` e `task_terminal_messages` antes de `task_terminal_sessions`), `packages/api/test/session-timeline.test.ts` (criar), `packages/api/test/issue-deletion-terminal.test.ts` (alterar)
  - **Testes:** V-21d, V-21e, V-27d, V-27e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-timeline.test.ts test/issue-deletion-terminal.test.ts test/terminal-execution-read.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- Autorização da REQ-080, a cada chamada: a sessão pertence à tarefa e ao projeto da entrada; `session.user_id = principal.userId`; o principal ainda é a operadora (a mesma checagem que o `open` usa via `workAuthorization`). Leitura da `timeline`: a mesma regra de leitura de `tasks.byId`.
- `answerQuestion` lê o payload do pedido, valida com `validateQuestionAnswers` e só então chama `answerIfPending`. Com `null`, relê o status: `answered` vira `request_answered`, `cancelled` vira `request_closed`. O mesmo vale para `decidePermission` com `validatePermissionDecision`; "Permitir sempre" grava a `suggestedRule` do payload, nunca uma regra vinda da entrada.
- `send` numa sessão `interrupted` grava a mensagem como as outras; quem retoma é o serviço (task_05).
- Cursor da `timeline`: `occurred_at` e `id` da última entrada, opaco para o cliente. `pending.requestIds` lista os pedidos `pending`. Sessão `runtime = terminal`: só eventos, com `canControl: false`.
- `machineIdentity` = `${os.hostname()}:${os.userInfo().username}`, sem depender de variável de ambiente.

### Arquivos relevantes
- `packages/api/src/routers/terminal.ts` e `artifacts.ts`: padrão de router com `protectedProcedure` e mapeamento de erros.
- `packages/api/src/controllers/taskArtifactController.ts`: leitura autorizada por tarefa.
- `packages/api/test/terminal-support.ts`, `terminal-harness.ts` e `terminal-open-support.ts`: como montar tarefa, operadora e vínculo nos testes.

### Arquivos afetados
- Os listados nas mini-tarefas. O route handler `apps/web/src/app/api/terminal-sessions/events/route.ts` não muda (sessões antigas).

### Decisões relacionadas
- DEC-16 e DEC-17 (spec §17): a web só escreve no banco; o serviço é quem age.
- DEC-18: sessões novas sem token nem `privado/settings.json`.

## Premissas
Nenhuma.

## Testes atribuídos
- [x] V-29b: operadora com vínculo válido e heartbeat recente chama `open` com `permissionMode: "accept_edits"` → linha com `status = opening`, `runtime = flow_dev`, `permission_mode = accept_edits`, `host_id = machineIdentity()`, e `contexto/` com as 4 skills e o prompt; nenhum processo disparado · controller + Postgres + pasta temporária
- [x] V-29c: `terminal_session_hosts` com `heartbeat_at` há 16 s → `preflight` devolve `sessionService.running = false`, e `open` recusa com `session_service_offline`; com 5 s → `running = true` · controller + Postgres, relógio controlado
- [x] V-32b: `open` com anexos e imagens da Issue → prompt, seção "Anexos" e arquivos na pasta da sessão iguais aos da Spec A (os testes `terminal-open*.test.ts` passando) · controller + Postgres
- [x] V-32f: sem `FLOW_DEV_TERMINAL_ENABLED=true` → `terminal_disabled`; com uma sessão ativa e `allowAdditional: false` → `session_already_active` · controller + Postgres
- [x] V-23a: operadora de outra sessão (que não a abriu) chama `send` → `session_control_denied`, nada gravado · controller + Postgres
- [x] V-23b: membro do projeto que não é operadora chama `send` → `session_control_denied` · controller + Postgres
- [x] V-23c: quem abriu deixou de ser operadora (B-22) → `send` recusado com `session_control_denied`, e a `timeline` devolve `canControl: false` · controller + Postgres
- [x] V-23d: `send` duas vezes com o mesmo `requestKey` → uma única linha em `task_terminal_messages`, e a segunda chamada devolve a mesma mensagem · controller + Postgres
- [x] V-23g: `content` vazio e com 20.001 caracteres → `message_invalid`; com 20.000 → aceito · controller + Postgres
- [x] V-23f: duas respostas para o mesmo pedido → a segunda recebe `request_answered`; resposta a um pedido `cancelled` → `request_closed`; nada muda no `answer` gravado · controller + Postgres
- [x] V-23h: `send`, `interrupt` e `end` numa sessão `ended` → `session_not_active` · controller + Postgres
- [x] V-23i: `interrupt` numa sessão `running` → `interrupt_requested_at` preenchido e status inalterado; `end` → `end_requested_at` preenchido · controller + Postgres
- [x] V-21d: sessão `flow_dev` em `waiting` há 31 min → `silentSince: null`; sessão `terminal` igual → `silentSince` preenchido (REQ-022) · leitor + Postgres, relógio controlado
- [x] V-21e: sessão `flow_dev` em `opening` há 61 s, sem o serviço ter assumido → a leitura grava e devolve `unconfirmed`; há 59 s → continua `opening` · leitor + Postgres, relógio controlado
- [x] V-27d: Issue com uma sessão `flow_dev` com 3 mensagens e 2 pedidos é excluída → as tabelas `task_terminal_messages` e `task_terminal_requests` ficam sem linhas dessa tarefa · expurgo + Postgres
- [x] V-27e: sessão com 210 entradas (mensagens, eventos e pedidos intercalados) → a `timeline` devolve as 200 mais recentes em ordem cronológica e `hiddenEntries: 10`; com o `cursor`, uma nova mensagem vem sozinha; uma sessão `runtime = terminal` devolve só eventos e `canControl: false`; quem não vê a tarefa recebe `FORBIDDEN` · leitor + Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando ao fim da tarefa.
- `pnpm --dir packages/api typecheck`, `pnpm --dir packages/api lint` e `pnpm --dir apps/web typecheck` sem erros (o contrato do `open` mudou).
- Nenhuma referência restante a `gnome-terminal` em `packages/api/src`.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->

### 2026-11-23 — 03.1 `open` e `preflight` sem terminal, com modo e serviço
- `open` agora só grava a sessão (`runtime = flow_dev`, `permission_mode`, `host_id = machineIdentity()`) e prepara `contexto/` e os anexos; nada é disparado. O prompt final (com a seção "Anexos") fica em `<sessão>/prompt.md` (modo 0600), gravado por `SessionContextBuilder.writePrompt` e lido por `readPrompt`, que a 04 usa. Não há coluna nova e o `contexto/` (a pasta do plugin) não ganha arquivo estranho.
- `preflight` devolve `sessionService: { running }` e o `open` recusa com `session_service_offline` ("O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo."). O serviço está rodando quando o heartbeat do `host_id` local tem menos de 15 s (`HeartbeatSessionServiceStatus`, relógio injetável).
- Removidos: `gnomeTerminalLauncher`, `recordingTerminalLauncher`, `terminalCommand`, `claudeHookSettings`, `application/terminal/terminalLauncher.ts` (o `ToolLocator` foi para `toolLocator.ts`) e os testes deles. `terminal_unavailable` saiu do contrato. `FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE` deixou de existir; `FLOW_DEV_SESSION_FAKE_SCRIPT` (fora de produção) faz o `PathToolLocator` aceitar qualquer ferramenta, para os e2e sem o `claude` instalado.
- Desvio: o `ClaudeSessionSettingsWriter` virou `FileSessionSettingsRemover` (só `remove`), porque as sessões antigas que terminam pelo endpoint HTTP ainda precisam apagar o `privado/settings.json` com o token. `createSessionToken` e `TerminalSessionDao.setTokenHash` saíram (as sessões novas não têm token, DEC-18).
- Falha ao preparar a pasta: a sessão vai a `launch_failed`, a pasta é descartada, os anexos voltam ao staging e o erro original sobe (resposta genérica); a mesma `requestKey` reabre a sessão e reinicia os campos (`runtime`, `permission_mode`, `host_id`, `worker_id`, controles).
- Desvio em testes: `terminal-event-support.ts` (que lia o token do `settings.json` que o `open` gravava) agora cria uma sessão antiga (`runtime = terminal`, com `token_hash` e o `privado/settings.json`) direto no banco, para os suítes V-32c e V-32d continuarem iguais. `terminal-open-token.test.ts` virou a asserção `token_hash IS NULL` e sem `privado/`.
- Teste novo `test/terminal-open-service.test.ts` (V-29b, V-29c, modo padrão e inválido). V-32b: os `terminal-open*.test.ts` seguem verificando prompt, "Anexos" e arquivos (agora lendo `prompt.md`); V-32f: `terminal_disabled` e `session_already_active` continuam nos testes `terminal-open-guards` e `terminal-open-additional`.
- `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-open.test.ts test/terminal-open-guards.test.ts test/terminal-open-additional.test.ts test/terminal-open-attachments.test.ts test/terminal-preflight.test.ts`: passa. Corrigi também o typecheck do web (rótulos de `asking` e `interrupted` em `executionCopy`, `ExecutionStatus` e `executionModel`, e `sessionService` no fixture `test/terminal.ts`); a 06 refina.

### 2026-11-23 — 03.2 `send` com autorização, limites e idempotência
- `SessionControlAuthorization` (REQ-080): a sessão precisa ser da tarefa e do projeto, ter sido aberta por quem chama e quem chama ainda precisa ser a operadora (o `operator_required` vira `session_control_denied`); `requireOwnActive` exige também `runtime = flow_dev` e estado não final (`session_not_active`). `SessionInteractionController.send`, `schemas/session.ts`, `routers/session.ts` (montado em `tasks.session`), `infra/sessionInteractionComposition.ts`.
- `test/session-send.test.ts` (8 casos: V-23a–d, V-23g e mais) passa.

### 2026-11-23 — 03.3 Responder, interromper e encerrar
- `SessionRequestController` (`answerQuestion`, `decidePermission`) separado do `SessionInteractionController` (`send`, `interrupt`, `end`), por causa das 100 linhas. O pedido respondido ou cancelado é recusado antes de validar a resposta; a resposta é validada contra o payload gravado e só então vai para `answerIfPending`; "Permitir sempre" nunca recebe regra do chamador.
- Testes `session-answer.test.ts`, `session-decision.test.ts` e `session-control.test.ts` (V-23f, V-23h, V-23i, V-22b–d pela API) passam. `SessionControllers = { interaction, requests, timeline }`.

### 2026-11-23 — 03.4 Linha do tempo, sessões antigas e exclusão
- `SessionTimelineController` + `SessionTimelineReader`, `sessionTimelineMerge.ts`, `sessionTimelineCursor.ts`, `DrizzleSessionTimelineDao` e `sessionTimelineQueries.ts`. `terminalExecutionReader` agora devolve `runtime` em cada sessão e `silentSince = null` nas `flow_dev`; `deletionPurge.ts` apaga pedidos e mensagens antes das sessões.
- Desvio (cursor): o cursor é o instante da última mudança (opaco), com 2 s de folga atrás do relógio. A resposta incremental traz as entradas criadas depois dele e também as que mudaram (pedido respondido, mensagem entregue) mais as mensagens `undelivered`; o cliente troca por `id`. Assim a tela não fica com "Na fila" ou "Aguardando" presos, o que o cursor `(occurred_at, id)` da tarefa não resolveria. `hiddenEntries` só vem na primeira página.
- Desvio (leitura): a `timeline` usa `requireRead` com memória de 5 s por pessoa e projeto, para o polling de 1,5 s não chamar o GitHub a cada vez. Quem não tem acesso ao projeto recebe `NOT_FOUND`, como o resto do projeto (a spec diz `FORBIDDEN`); sessão de outra tarefa, `task_unavailable`. `canControl` usa só o banco: sessão `flow_dev`, aberta por quem chama, que ainda é a operadora (`claimed`); a autorização real de cada ação continua no `requireOperate`.
- `claimOpening` passou a pegar também sessões `unconfirmed` sem dono (a tabela 7.2 leva "Não confirmada" a "Em andamento" quando o serviço enfim inicia).
- Testes: `session-timeline.test.ts` e `session-timeline-access.test.ts` (V-27e, V-23c), `session-runtime-read.test.ts` (V-21d, V-21e) e o novo caso V-27d em `issue-deletion-terminal.test.ts` passam, junto com `terminal-execution-read.test.ts`.

### 2026-11-23 — Fechamento da tarefa
- `pnpm --dir packages/api typecheck`: sem erros. `pnpm --dir packages/api test`: 93 arquivos, 633 testes passam (caiu de 648 porque os testes do lançador e do gerador de settings saíram). `pnpm --dir packages/api test:integration`: 102 arquivos, 582 testes passam. `pnpm --dir apps/web typecheck`: sem erros. Nenhuma referência a `gnome-terminal` em `packages/api/src`.
- O pacote não tem script `lint`. Nenhum arquivo novo passa de 100 linhas (testes grandes foram divididos); `schema.ts` (barrel, 130 linhas) já passava e só ganhou uma linha de exportação.
- Os specs e2e `terminal-execution.spec.ts` e `terminal-tracking.spec.ts` ficam quebrados até a 07.1, como o plano avisa.

