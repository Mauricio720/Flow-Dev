---
status: completed
title: "Passo do ciclo: condução das rodadas"
type: backend
complexity: critical
---

# Task 05: Passo do ciclo: condução das rodadas

## Visão geral
Cria o `ReviewCycleStep`, registrado no tick de 1 s do serviço de sessões, e o caminho principal do ciclo: abrir a sessão de revisão, ler `reviews/etapa.md` quando a sessão da vez termina o turno, registrar a rodada, passar a vez à execução e de volta, sempre nas mesmas duas sessões, e encerrar as duas no fim. Inclui ressalvas (aceitar e pedir correção) e a espera sem prazo com pergunta ou permissão pendente. As falhas, paradas e retomada ficam na 06.

<critical>
- LEIA a spec (§7.1, §7.3, §7.5, §12, §16 item 2, §19, DEC-01, DEC-02, DEC-08) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`.claude/skills/software-testing/SKILL.md`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-004 (sessão): no tick seguinte ao `start`, o passo DEVE abrir a sessão de revisão com `reviewInitialPrompt` e gravar `step_started_at`.
- REQ-012: QUANDO a sessão da vez terminar um turno depois de `step_started_at` sem pedido pendente, o passo DEVE ler a etapa por `readStage` (02).
- REQ-013: `execute` → mensagem de execução à sessão de execução, abrindo-a na primeira vez; `aprovada` → ciclo `approved`; `ressalvas` → ciclo `caveats`, esperando a operadora.
- REQ-014: QUANDO a execução terminar o turno com `review` gravada, o passo DEVE mandar `reviewContinuation` à mesma sessão de revisão, numa rodada nova.
- REQ-017: prompts iniciais na abertura; continuações como mensagens (`SystemMessageSender`, 03).
- REQ-019: cada rodada DEVE registrar veredito, `report_path`, `report_version_id` (depois de forçar a captura `stop` na revisão), as sessões usadas e `reviewed_at`/`executed_at`.
- REQ-028 / REQ-029: o pedido `accept` DEVE terminar em `accepted` com `ended_by` e `ended_at`; `fix` DEVE mandar `caveatsPrompt` à sessão de execução (abrindo-a com ele, se ainda não existe).
- REQ-016: ENQUANTO a sessão da vez tiver pergunta ou permissão pendente, o ciclo DEVE ficar na etapa, sem prazo.
- REQ-037: o ciclo DEVE ser conduzido só pelo serviço, sem tela aberta.
- REQ-040 / REQ-041: no fim (Aprovada, Ressalvas aceitas), as duas sessões DEVEM ser encerradas; enquanto uma trabalha, a outra fica aberta, aguardando.
- NFR-02: a etapa seguinte DEVE começar na mesma execução do passo em que o fim do turno é visto.
- NFR-04: no máximo uma sessão de revisão e uma de execução por ciclo; cada rodada é mensagem a elas.
- NFR-06 / §19: linhas `[review]` `cycle_started`, `step_opened`, `step_continued`, `stage_read`, `cycle_finished` com `cycleId`, `taskId`, `round`, `role`, `sessionId`, `durationMs`, sem conteúdo de relatório nem de prompt.

## Interfaces
- **Consome:** `readStage`, `applyStage`, `applyAction`, prompts de `reviewPrompts.ts`, `stageDocumentPath` (02); `SessionLauncher.launch`, `SystemMessageSender.send`, finalidades `review`/`review_execute` (03); `ReviewCycleDao`, `ReviewCycleView` (04); a coluna `step_role` (01); `TickStep` (`sessionTickStep.ts`); `CheckoutFileReader` (`application/terminal/checkoutFileReader.ts`); a captura de artefatos (`artifactCaptureTrigger.ts`, `recorder.captureEnd`); o fim de sessão pelos controles (`SessionControlsStep`/pedido de fim que a conversa já usa); `SessionLog`.
- **Produz:**
  - `ReviewCycleStep implements TickStep` (`name = "review"`) em `packages/api/src/application/services/review/reviewCycleStep.ts`, com partes em arquivos irmãos (`reviewStepOpen.ts`, `reviewStepTurn.ts`, `reviewStepActions.ts`, `reviewLog.ts`).
  - `ReviewCycleWorkerDao` em `packages/api/src/application/database/dao/reviewCycleWorkerDao.ts`, com implementação Drizzle em `infra/database/dao/review/`: `listForHost(hostId)`, `setSession({ cycleId; role; sessionId; stepStartedAt })`, `transition({ cycleId; revision; next })` (condicional à `revision`, incrementa; `next` traz `state`, `stepRole`, `round`, `stepStartedAt`), `openRound`, `recordReview`, `recordExecution`, `clearPending`, `sessionTurn(sessionId)` (último fim de turno, pendências e `file_edit` desde uma data).
  - Chaves derivadas: abertura `review:{cycleId}:{role}:{attempt}`; mensagem `review:{cycleId}:{role}:{round}:{revision}` — mantenha-as num só módulo (`reviewRequestKeys.ts`) para 06 reaproveitar.
  - `ReviewCycleStep` registrado em `buildSteps` de `packages/api/src/infra/sessionWorkerComposition.ts`, depois de `MessageDeliveryStep`.

## Mini-tarefas

- [x] **05.1 — DAO do serviço, esqueleto do passo, registro e logs**
  - **Arquivos:** `packages/api/src/application/database/dao/reviewCycleWorkerDao.ts` (criar), `packages/api/src/infra/database/dao/review/drizzleReviewCycleWorkerDao.ts` (criar), `packages/api/src/application/services/review/reviewCycleStep.ts` (criar), `reviewLog.ts` (criar), `reviewRequestKeys.ts` (criar), `packages/api/src/infra/sessionWorkerParts.ts` e `sessionWorkerComposition.ts` (alterar), `packages/api/test/review-cycle-step.test.ts` (criar), `packages/api/test/review-cycle-world.ts` (criar)
  - **Testes:** V-05g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-step.test.ts` passa
  - **Nota:** o primeiro teste é a abertura da sessão de revisão no tick seguinte ao `start` com a linha `step_opened`; os outros logs são afirmados em 05.2–05.4 à medida que as transições existem, todos dentro de V-05g.
- [x] **05.2 — Fim do turno da revisão: leitura, captura e rodada**
  - **Arquivos:** `reviewStepTurn.ts` (criar), `reviewCycleStep.ts` (alterar), `packages/api/test/review-cycle-step.test.ts` (alterar)
  - **Testes:** V-05h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-step.test.ts` passa
- [x] **05.3 — Passagem de vez nas mesmas duas sessões e fim do ciclo**
  - **Arquivos:** `reviewStepOpen.ts` (criar), `reviewStepTurn.ts` (alterar), `packages/api/test/review-cycle-rounds.test.ts` (criar)
  - **Testes:** V-05a, V-05b, V-05e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-rounds.test.ts test/review-cycle-step.test.ts` passa
- [x] **05.4 — Ressalvas e pendências na sessão da vez**
  - **Arquivos:** `reviewStepActions.ts` (criar), `reviewCycleStep.ts` (alterar), `packages/api/test/review-cycle-caveats.test.ts` (criar), `packages/api/test/review-cycle-pending.test.ts` (criar)
  - **Testes:** V-05c, V-05d, V-07a, V-07b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-caveats.test.ts test/review-cycle-pending.test.ts test/review-cycle-rounds.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- O tick segue §16 item 2, na ordem: (2.1 posse/planejamento/conjunto — implementado na 06.3; aqui deixe o ponto de extensão) → 2.2 pedido pendente (`accept` e `fix` aqui; `stop` e `retry` na 06.1) → 2.3 abrir a sessão do papel da vez se não existe → 2.4 falha (06.2) → 2.5 fim do turno.
- "Terminou um turno sem pedido pendente": o último evento de fim de turno da sessão é posterior a `step_started_at` e não há `task_session_requests` abertos dela. Com pendência, o passo não faz nada (REQ-016); o estado da aba vira "Aguardando você" na tela (07).
- Na revisão, antes de ler o documento, force a captura `stop` (o mesmo caminho de `captureEnd`) para que a versão de `review-NNN.md` exista; `report_version_id` é a versão desse caminho capturada nessa vez.
- O "número anterior" para `readStage` é o NNN de `report_path` da rodada anterior do ciclo; na rodada 1, nulo.
- Toda transição usa `transition` condicional à `revision` (a web pode ter gravado um pedido no meio): se a `revision` mudou, abandone a transição neste tick e reavalie no próximo.
- O fim das sessões usa o pedido de fim que a conversa já usa (`ended` com motivo do ciclo), para que 06.2 distinga "encerrada pelo ciclo" de "encerrada sem pedido do ciclo".
- Testes: um mundo (`review-cycle-world.ts`) sobre `workerWorld`/`cycle` de `test/session-worker-support.ts`, com um conjunto de tarefas semeado (`seedVersions`, `manifestWith`, `taskFileWith`), um ciclo criado pelo serviço da 04 e roteiros por finalidade (03.1). Rode o passo pelo `supervisor.tick()` real, sem esperas fixas.

### Arquivos relevantes
- `packages/api/src/infra/sessionWorkerComposition.ts`, `sessionWorkerParts.ts`: composição dos passos.
- `packages/api/src/application/services/terminal/openingStep.ts`, `sessionControls.ts`, `heartbeatStep.ts`: padrão de `TickStep`.
- `packages/api/src/application/services/terminal/artifactCaptureService.ts`, `application/terminal/artifactCaptureTrigger.ts`: captura forçada.
- `packages/api/test/task-plan-journey.test.ts`, `session-worker-support.ts`, `plan-support.ts`, `task-set-support.ts`: jornada da Spec D com o serviço real.

### Arquivos afetados
- `sessionWorkerComposition.ts`/`sessionWorkerParts.ts`: o passo novo e suas dependências.

### Decisões relacionadas
- DEC-01, DEC-02, DEC-08 (spec §17).

## Premissas
Nenhuma. Toda transição grava `step_role` junto com `state` e `step_started_at`; em `failed`, `step_role` continua sendo o papel que falhou.

## Testes atribuídos
- [x] V-05g (NFR-06): ao longo de um ciclo Reprovada → Aprovada, o log tem, em ordem, `cycle_started`, `step_opened` (review), `stage_read` (execute, com o caminho do relatório), `step_opened` (execute), `stage_read` (review), `step_continued` (review), `stage_read` (aprovada), `cycle_finished`, cada uma com `cycleId`, `taskId`, `round`, `role`, `sessionId`; nenhuma linha contém o texto do prompt nem do relatório · passo + log capturado.
- [x] V-05h (REQ-012, REQ-019): a revisão grava `review-004.md` com REPROVADO e `etapa.md` com `execute` e termina o turno → um tick deixa a rodada 1 com `verdict = 'rejected'`, `report_path` = o caminho, `report_version_id` apontando a versão capturada de `review-004.md`, `review_session_id` e `reviewed_at`; a revisão termina o turno sem gravar nada → o passo não muda o estado aqui (a falha é da 06.1) · passo + Postgres + runtime roteirizado.
- [x] V-05a (US-02 cen. 1–3, US-03 cen. 3, REQ-013–015, REQ-037, REQ-040–041, NFR-04): roteiros Reprovada → execução grava `review` → Aprovada, sem nenhuma tela → ciclo `approved` com 2 rodadas (`rejected`, `approved`); `task_terminal_sessions` do ciclo = exatamente 2 (`review`, `review_execute`) com `review_cycle_id`; a rodada 2 chegou como mensagem (`task_session_messages`) à mesma sessão de revisão; a execução recebeu `executeInitialPrompt` com `review-004.md`; a sessão de revisão não foi encerrada enquanto a execução trabalhava; no fim as duas estão `ended` · passo + entrega e retomada reais + Postgres + runtime roteirizado.
- [x] V-05b (§7.1): revisão grava `aprovada` na rodada 1 → ciclo `approved` e nenhuma sessão `review_execute` criada · idem.
- [x] V-05e (NFR-02, Foco de revisão 4): a execução termina o turno com `review` gravada → a mensagem de continuação existe ao fim de um único `tick()`; um segundo `tick()` antes de a revisão começar não cria segunda mensagem (mesma `requestKey`) · idem.
- [x] V-05c (US-05 cen. 1, REQ-028): revisão grava `ressalvas` na rodada 2 → ciclo `caveats`, nenhuma mensagem nova; pedido `accept` (pelo serviço da 04) → um tick deixa `accepted`, `ended_by` = operadora, `ended_at` = relógio controlado, as duas sessões `ended` · idem.
- [x] V-05d (US-05 cen. 2, REQ-029): ressalvas na rodada 2 e pedido `fix` → a mesma sessão de execução recebe `caveatsPrompt`, ciclo `executing` na rodada 2; ela grava `review` → a mesma sessão de revisão recebe a continuação da rodada 3; ressalvas na rodada 1 (sem execução ainda) e `fix` → a sessão de execução abre com `caveatsPrompt` · idem.
- [x] V-07a (US-02 cen. 4, REQ-016): a execução termina com uma pergunta `ask` aberta → ticks repetidos com o relógio avançado 2 horas deixam o ciclo em `executing`, sem falha nem mensagem; a operadora responde, a sessão grava `review` e termina o turno → o ciclo segue para a rodada seguinte · idem, roteiro com `ask`.
- [x] V-07b: o mesmo com um pedido `permission` aberto na revisão → o ciclo fica em `reviewing`; respondida a permissão e gravado `execute` → segue · idem, roteiro com `permission`.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Ao fim da tarefa: `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` completos passando uma vez.
- Typecheck e lint do pacote sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. -->
- 2026-11-25 · **05.1 concluída.** Criados o DAO de trabalho, as chaves idempotentes, os logs `[review]` e o `ReviewCycleStep`, registrado depois de `MessageDeliveryStep`. O tick abriu a sessão de revisão via `SessionLauncher`, associou `review_cycle_id` e salvou `step_started_at`; V-05g já valida os eventos de abertura e a ausência de prompt/relatório nos logs. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-step.test.ts` → 1 arquivo e 1 teste passou. A chave textual descrita na spec é transformada em UUID determinístico, pois a coluna de sessão é UUID. `review-cycle-support.ts` foi extraído para compartilhar a composição de teste com o novo `review-cycle-world.ts`.
- 2026-11-25 · **05.2 concluída.** O passo identifica o fim de turno posterior a `step_started_at`, ignora pendências, força captura `stop`, lê `reviews/etapa.md`, valida relatório novo e grava veredito, caminho, versão capturada, sessão e horário; turno sem documento não altera o ciclo. V-05h passou. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-step.test.ts` → 1 arquivo e 3 testes passaram. Extensões necessárias fora da lista desta mini-tarefa: `sessionRecorder.captureStop()` aciona o capturador existente com trigger `stop`; `ReviewCycleWorkerDao` lê o caminho/versão do relatório anterior/atual para validar e persistir a referência.
- 2026-11-25 · **05.3 concluída.** `ReviewStepOpen` abre execução com prompt inicial e cada papel reaproveita sua sessão; a transição de execução grava a nova rodada e envia `reviewContinuation` com `requestKey` derivada no mesmo tick; aprovação marca o fim e pede o encerramento das duas sessões. V-05a, V-05b, V-05e e V-05g foram exercitados com Postgres e runtime real roteirizado. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-rounds.test.ts test/review-cycle-step.test.ts` → 2 arquivos e 6 testes passaram. Extensões necessárias fora da lista: `reviewCycleWorkerDao` e seu DAO Drizzle atualizam as referências de sessão da rodada e persistem `ended_by`/`ended_at`; `sessionWorkerComposition.ts` injeta abertura, mensagens e controles no passo.
- 2026-11-25 · **05.4 concluída.** `accept` e `fix` são processados por `ReviewStepActions` com transição condicional à revisão; aceitar grava `ended_by`/`ended_at` e pede o encerramento das duas sessões; corrigir reutiliza a sessão de execução ou abre com `caveatsPrompt`. Perguntas e permissões pendentes bloqueiam a leitura da etapa sem prazo; depois da resposta, o ciclo retoma a transição. V-05c, V-05d, V-07a e V-07b passaram. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-caveats.test.ts test/review-cycle-pending.test.ts test/review-cycle-rounds.test.ts` → 3 arquivos e 8 testes passaram; `pnpm --dir packages/api typecheck` → passou. Extensões necessárias fora da lista: `reviewStepOpen.ts` aceita o prompt inicial de ressalvas; `ReviewStepTurn.finish()` é compartilhado para o encerramento; o DAO de trabalho limpa ações pendentes nas transições; `sessionWorkerParts.ts` usa `PathToolLocator` para o probe/processo Codex enquanto mantém a ferramenta injetada para a abertura do terminal, resolvendo os tipos da composição.
- 2026-11-25 · **Task 05 fechada.** `pnpm --dir packages/api test` → 136 arquivos e 848 testes passaram; `pnpm --dir packages/api test:integration` → 173 arquivos passaram, 2 ignorados; 826 testes passaram, 5 ignorados. `pnpm lint` → passou para `apps/web`; `packages/api` não declara script de lint.
- 2026-11-25 · Correção da review-001 (B-2, I-1, I-2, M-1, M-3): V-05a, V-05e e V-06f deixaram de depender do número de ticks e da revisão do ciclo (`tickUntil`, mensagens por conteúdo); `review-cycle-rounds.test.ts` e `review-cycle-caveats.test.ts` foram divididos com arquivos `*-support.ts`. `ReviewStepTurn` foi dividido em `ReviewStageLoader`, `ReviewMessenger` e `ReviewCycleFinisher`; funções com mais de 3 parâmetros ganharam objetos de parâmetro; `reportNumber` é reaproveitado do leitor. Estável: 4 execuções seguidas de `test/review-` com carga paralela (antes falhava em quase toda rodada).
- 2026-11-25 · Correção da review-002 (I-1, M-1, flakes): V-05a e V-05c voltaram a provar `endedAt` contra o relógio do tick que encerrou (`world.worker.clock.now()`), e V-05c conta todas as mensagens de usuário da revisão. `ReviewStepTurn.review` grava a rodada antes da transição (idempotente por `(cycle_id, number)`). V-07a/V-07b esperam o estado com `tickUntil` em vez de dois ticks fixos (V-07b falhou uma vez sob carga). Fica como risco residual a queda exatamente entre a transição para "Revisando"/"Executando" e o envio da mensagem de continuação: a mensagem não é reenviada sozinha; a operadora usa "Parar revisão" e inicia outro ciclo.
