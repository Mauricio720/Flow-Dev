---
status: completed
title: Passo do worker que inicia as sessões sozinho
type: backend
complexity: critical
---

# Task 04: Passo do worker que inicia as sessões sozinho

## Visão geral
Cria o `PlanRunStep`, um passo do worker de sessões ao lado do `ReviewCycleStep`. A cada tick ele confere as guardas, espera enquanto algum agente da feature trabalha, pausa quando a sessão corrente parou com tarefas abertas, e inicia a próxima sessão Pronta por `SessionLauncher.launch`. É o coração do "Executar o plano".

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-017: ENQUANTO a execução estiver `running` e nenhum agente da feature trabalhar (7.4), o passo DEVE percorrer as sessões nunca iniciadas na ordem e iniciar a primeira Pronta; Bloqueadas são puladas.
- REQ-018: o início automático DEVE usar agente, modelo e esforço da sessão, o prompt de execução da D-7.6 (`executionPromptOf`) para as tarefas não concluídas, nenhum anexo, `DEFAULT_PERMISSION_MODE` e o clone de `started_by`, em nome dessa pessoa; conta como início comum (marca a sessão do plano como iniciada).
- REQ-019: todas as sessões Concluídas → `completed`, e nada mais começa.
- REQ-020: cada escolha usa o plano salvo naquele tick.
- REQ-021: uma sessão iniciada à mão deixa de ser candidata; a execução espera enquanto o agente dela trabalha.
- REQ-022: sessão corrente parada (vez terminada, encerrada ou falha ao abrir) com tarefas não concluídas → pausa com "A Sessão N terminou com tarefas não concluídas: 01, 02." ou "A Sessão N falhou ao abrir: <motivo>.". A sessão do agente não é encerrada.
- REQ-023: `launch` recusado → pausa com "Não foi possível iniciar a Sessão N. <mensagem do Iniciar para o motivo>", sem nova tentativa.
- REQ-024: nenhuma Pronta, nenhum agente trabalhando e sessões não Concluídas → pausa com "Nenhuma sessão pode começar." + uma frase por sessão que falta ("A Sessão 2 aguarda 01.", "A Sessão 3 aguarda a Sessão 2.", "A Sessão 1 foi encerrada com tarefas não concluídas.").
- REQ-025: sessão vazia na vez → pausa com a mensagem da REQ-016.
- REQ-026: operadora mudou, planejamento não aprovado, conjunto ilegível, pasta das tarefas mudou → pausa com "A operadora da feature mudou.", "O planejamento não está mais aprovado.", "O conjunto de tarefas não pode ser lido.", "A pasta das tarefas mudou. Revise o plano.".
- REQ-027/REQ-028 (worker): depois de "Pausar", nada começa; ao retomar, a sessão só com falha ao abrir volta a ser candidata (D-B-39), a encerrada com tarefas abertas não.
- 7.4: agente trabalhando = sessão do agente desta feature, de qualquer propósito, em `opening`, `unconfirmed`, `running` ou `asking` (ou com pergunta/permissão pendente). `waiting`, `interrupted`, `ended` e `launch_failed` não contam.
- NFR-01: tick de 1 s; a próxima sessão começa em até 10 s.
- NFR-02: cada sessão é iniciada no máximo uma vez por execução e retomada, mesmo com ticks repetidos ou reinício do worker (`requestKey` de `runId`, `itemId`, `resume_count`).
- B-02 a B-10 (veja os testes).
- §19: logs `run_session_started` (item, sessão, agente, modelo), `run_paused` (código do motivo, item) e `run_completed`.

## Interfaces
- **Consome:** `PlanRunRecord`, `PlanRunDao.transition`, `PlanLog.runSessionStarted/runPaused/runCompleted`, `planRunCopy.ts` (task_03); `buildPlanView`/`itemReadiness`/`waitingSessions`/`empty` (task_01); `loadItem`, `executionPromptOf` (`purposePlanItem.ts`); `SessionLauncher.launch`; `TaskError` e as mensagens do "Iniciar" (`taskErrors`/catálogos do terminal); `IssueClaimDao.claimByTask`, `TerminalSessionDao.approvedPlanning`, `TaskSetLoader.load`.
- **Produz:**
  - `decidePlanRun(input: { items: PlanItemView[]; run: PlanRunRecord; working: boolean; current: { status: TerminalSessionStatus; launchError: string | null } | null }) → { kind: "wait" } | { kind: "start"; itemId: string } | { kind: "pause"; code: PlanRunPauseCode; reason: string; itemId: string | null } | { kind: "complete" }` em `application/services/plan-run/planRunSelection.ts`.
  - `LaunchInput` de `SessionLauncher.launch` vira união: a variante atual de revisão e `{ purpose: "plan_item"; planItemId: string; ... }`.
  - `planRunOpenRequestKey({ runId, itemId, resumeCount })`.
  - `PlanRunWorkerDao`: `listRunningForHost(hostId)`, `agentWorking(taskId)`, `setCurrent({ runId, revision, itemId, sessionId })`, `currentSession(sessionId)`.
  - `PlanRunStep implements TickStep` (`name = "plan_run"`), registrado em `packages/api/src/infra/sessionWorkerComposition.ts` por `buildPlanRunStep(parts)`.

## Mini-tarefas

- [x] **04.1 — Seleção pura: esperar, iniciar, pausar ou concluir**
  - **Arquivos:** `packages/api/src/application/services/plan-run/planRunSelection.ts` (criar), `planRunPauseReasons.ts` (criar: frases da REQ-022/024/025), `planRunSelection.test.ts` (criar), `planRunCopy.ts`
  - **Testes:** V-05a, V-05b, V-05c, V-05d, V-05e, V-05f, V-05g, V-05h, V-05i, V-05j, V-05k, V-05l, V-05m, V-05n
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/plan-run/planRunSelection.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** a ordem da §16 é: (2) `working` → `wait`; (3) corrente parada e não Concluída → `pause`; (4) percorre as nunca iniciadas (`!started`): `empty` → `pause`, `ready` → `start`, `blocked` → pula; (5) sem candidata → `complete` se todas `done`, senão `pause` REQ-024. A guarda (1) fica na 04.3.
- [x] **04.2 — `SessionLauncher.launch` com o propósito `plan_item`**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionLauncher.ts`, `launchSessionInput.ts` (criar: monta o `CreateTerminalSessionInput` das duas variantes, para manter o launcher abaixo de 100 linhas), `packages/api/src/application/services/plan-run/planRunRequestKeys.ts` (criar), `packages/api/src/application/services/review/reviewStepOpen.ts` (ajuste de tipo, se preciso), `packages/api/test/plan-run-launcher.test.ts` (criar)
  - **Testes:** V-06a, V-06b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-run-launcher.test.ts test/review-session-launcher.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** a variante `plan_item` grava `planItemId` na sessão e chama `purposes.confirm` com o `ResolvedPurpose` do item (como o `startManual`), para marcar a sessão do plano como iniciada igual ao "Iniciar" (DEC-07). Espelhe `test/review-session-launcher.test.ts` (runtime dublado).
- [x] **04.3 — DAO do worker e guardas da execução**
  - **Arquivos:** `packages/api/src/application/database/dao/planRunWorkerDao.ts` (criar), `packages/api/src/infra/database/dao/plans/drizzlePlanRunWorkerDao.ts` (criar), `packages/api/src/application/services/plan-run/planRunGuards.ts` (criar), `packages/api/test/plan-run-guards.test.ts` (criar)
  - **Testes:** V-06c, V-06d, V-06e, V-06f, V-06g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-run-guards.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** espelhe `ReviewStepGuards`. `agentWorking(taskId)` consulta todas as sessões do agente da feature (`task_terminal_sessions.task_id`) pelos estados da 7.4, inclusive pedidos pendentes. A pasta mudou = `planFolderChanged`.
- [x] **04.4 — `PlanRunStep` inicia, conclui e não duplica**
  - **Arquivos:** `packages/api/src/application/services/plan-run/planRunStep.ts` (criar), `planRunStepStart.ts` (criar: chama o launch e trata a recusa), `packages/api/src/infra/planRunStepComposition.ts` (criar), `packages/api/src/infra/sessionWorkerComposition.ts`, `packages/api/src/infra/sessionWorkerParts.ts` (95 linhas: extraia a montagem das dependências da execução para `planRunWorkerParts.ts`), `packages/api/test/plan-run-step.test.ts` (criar), `packages/api/test/plan-run-step-support.ts` (criar)
  - **Testes:** V-06h, V-06i, V-06j, V-06k, V-06l
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-run-step.test.ts test/plan-run-guards.test.ts test/review-cycle-step.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** espelhe `ReviewCycleStep` e `test/review-cycle-step.test.ts`/`session-worker-support.ts` (relógio controlado, runtime dublado). Grave a sessão corrente com `setCurrent` por `revision`; se a transição falhar, não chame `launch`.
- [x] **04.5 — Pausa concorrente e retomada no worker**
  - **Arquivos:** `planRunStep.ts`, `planRunStepStart.ts`, `packages/api/test/plan-run-resume.test.ts` (criar)
  - **Testes:** V-06m, V-06n
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-run-resume.test.ts test/plan-run-step.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
Passo a espelhar: `packages/api/src/application/services/review/reviewCycleStep.ts`, `reviewStepGuards.ts`, `reviewStepOpen.ts` e `reviewRequestKeys.ts`; a composição em `infra/reviewStepComposition.ts`. O lançador do worker está em `parts.reviewLauncher` (`lazyReviewLauncher` em `sessionWorkerParts.ts`): reaproveite-o, renomeando se fizer sentido, e registre. A visão usada na seleção é `buildPlanView` sobre o plano salvo e o conjunto de tarefas lido no tick. A mensagem do "Iniciar" para um motivo vem do mesmo catálogo que o controller usa para o `open` (`mapTaskError`/mensagens dos `TaskError`).

### Arquivos relevantes
- `packages/api/src/application/services/terminal/sessionPurpose.ts` e `purposePlanItem.ts`: `loadItem`, `requireStartable`, `executionPromptOf`, `ResolvedPurpose` do `plan_item`.
- `packages/api/src/application/terminal/terminalSessionStatus.ts`: estados das sessões.
- `packages/api/test/review-cycle-step.test.ts`, `review-cycle-world.ts`, `session-worker-support.ts`: mundo de teste do worker.

### Arquivos afetados
- `sessionLauncher.ts`, `sessionWorkerComposition.ts`, `sessionWorkerParts.ts` e os novos de `plan-run/`, `infra/` e `dao/plans/`.

### Decisões relacionadas
- DEC-01: passo do worker; latência de 1 tick.
- DEC-05: `waiting` não segura a fila (B-06).
- DEC-07: início por `SessionLauncher.launch`, sem diálogo, `requestKey` determinística.

## Premissas
- **B-03 × US-04 cen. 2:** B-03 é o worker desta máquina parado: sem tick, a execução fica `running` e segue quando ele volta (coberto pelo V-06k, reinício sem duplicar). US-04 cen. 2 é o `launch` recusado com `session_service_offline` dentro de um tick, que pausa pela REQ-023 (V-06j).
- **Frases da REQ-024:** decidido pela operadora em 2026-11-26: vale a REQ-024, uma frase por sessão que falta, na ordem das sessões (o US-04 cen. 4 da spec foi alinhado).
- "Pergunta ou permissão pendente" é o estado `asking` ou um pedido pendente em `task_terminal_requests`; confirme a fonte no código ao escrever o `agentWorking` e registre.

## Testes atribuídos
- [x] V-05a: `working: true` com execução `running` e Sessão 2 Pronta → `{ kind: "wait" }` · `decidePlanRun` pura
- [x] V-05b: `working: false` (as sessões da feature estão `waiting` ou `interrupted`) e Sessão 1 Pronta → `{ kind: "start", itemId: id1 }` (B-06, DEC-05) · pura
- [x] V-05c: Sessão 1 Bloqueada (aguarda a 03 de "Sem sessão") e Sessão 2 Pronta → `start` da Sessão 2 (pula a Bloqueada) · pura
- [x] V-05d: corrente = Sessão 1 em `waiting` com a 01 `in_progress` → `pause` com "A Sessão 1 terminou com tarefas não concluídas: 01." (US-04 cen. 1) · pura
- [x] V-05e: corrente = Sessão 1 em `launch_failed` com `launchError` "o Claude Code não respondeu" → `pause` com "A Sessão 1 falhou ao abrir: o Claude Code não respondeu." · pura
- [x] V-05f: corrente = Sessão 1 `ended` com todas as tarefas `completed` e Sessão 2 Pronta → `start` da Sessão 2 (B-05) · pura
- [x] V-05g: próxima nunca iniciada com estado `empty` → `pause` com "A Sessão 2 está sem tarefas. Adicione tarefas ou remova a sessão." (REQ-025) · pura
- [x] V-05h: todas as sessões `done` → `{ kind: "complete" }` (US-03 cen. 3) · pura
- [x] V-05i: Sessão 1 `ended` com a 01 aberta, Sessão 2 (02, depende da 01) Bloqueada, Sessão 3 já `done` → `pause` com "Nenhuma sessão pode começar. A Sessão 1 foi encerrada com tarefas não concluídas. A Sessão 2 aguarda 01." (frases na ordem das sessões; US-04 cen. 4, segunda parte) · pura
- [x] V-05j: Sessão 3 com `after` = Sessão 2 não concluída e nenhuma outra candidata → frase "A Sessão 3 aguarda a Sessão 2." · pura
- [x] V-05k: Sessão 2 iniciada à mão e em `running` (`working: true`) → `wait`; depois em `waiting` com tarefas concluídas → segue para a próxima nunca iniciada (REQ-021) · pura
- [x] V-05l: `working: true` por uma sessão de revisão automática em `running` (B-07) e por uma sessão `asking` (B-04) → `wait` nos dois casos · pura
- [x] V-05m: `working: true` por sessão `opening` e por `unconfirmed` → `wait` · pura
- [x] V-05n: a Sessão 2 Pronta já tem `started: true` (iniciada à mão) e a Sessão 3 é Pronta → `start` da Sessão 3 · pura
- [x] V-06a: `launch` com `{ purpose: "plan_item", planItemId }` → sessão criada com `plan_item_id`, `agent`/`model`/`effort` da sessão do plano, `permission_mode` padrão, `user_id` = `started_by`, `checkout_path` do clone dessa pessoa, prompt de execução citando só os `task_NN.md` não concluídos, e a sessão do plano passa a `started` · `SessionLauncher` + Postgres, runtime dublado
- [x] V-06b: `launch` duas vezes com a mesma `planRunOpenRequestKey` → uma sessão só (`created: false` na segunda) · Postgres
- [x] V-06c: execução `running` e a feature passa a outra operadora → o tick pausa com "A operadora da feature mudou." e não abre sessão · `PlanRunGuards` + Postgres
- [x] V-06d: replanejamento desaprova o planejamento (B-10) → pausa com "O planejamento não está mais aprovado." · Postgres
- [x] V-06e: conjunto de tarefas com manifesto inválido → pausa com "O conjunto de tarefas não pode ser lido." · Postgres
- [x] V-06f: pasta das tarefas mudou (aviso "Usar as tarefas de …") → pausa com "A pasta das tarefas mudou. Revise o plano." · Postgres
- [x] V-06g: `agentWorking` com sessões da feature em `running` (rota), `asking` (plano) → `true`; só `waiting`, `interrupted`, `ended` e `launch_failed` → `false`; sessão `running` de outra feature → `false` · `DrizzlePlanRunWorkerDao` + Postgres
- [x] V-06h: execução `running`, Sessão 1 Pronta → um tick abre a sessão do agente da Sessão 1, grava `current_item_id`/`current_session_id`, e o log tem `run_session_started` com item, sessão, agente e modelo · `PlanRunStep` + Postgres, runtime dublado, relógio controlado
- [x] V-06i: o roteiro marca a 01 `completed` e termina a vez → no tick seguinte a Sessão 2 abre; com a Sessão 2 concluída, o tick grava `completed` e o log `run_completed`; mais ticks não abrem nada (US-03 cen. 2–3) · Postgres
- [x] V-06j: `launch` recusado com `session_service_offline` → execução `paused` com "Não foi possível iniciar a Sessão 2. O serviço de sessões não está rodando nesta máquina." e nenhuma nova tentativa no tick seguinte (US-04 cen. 2) · Postgres, guard dublado no serviço
- [x] V-06k: dois ticks seguidos e um "reinício" do worker (novo `PlanRunStep` com o mesmo banco) antes da sessão aparecer → uma única sessão do agente para a Sessão 1 (NFR-02, B-03) · Postgres
- [x] V-06l: durante a execução, a operadora salva o plano movendo a 02 da Sessão 2 para a Sessão 3 → o próximo início usa o plano salvo (abre a Sessão 3 com a 02 se for a primeira Pronta); com o manifesto mudado (plano desatualizado), a execução continua (REQ-020, B-08) · Postgres
- [x] V-06m: "Pausar" grava a nova `revision` entre a leitura da execução e o `setCurrent` do tick → o tick não chama `launch`; uma sessão que já estava abrindo segue (B-02) · Postgres, relógio controlado
- [x] V-06n: pausada com a Sessão 1 `launch_failed` → "Retomar" e um tick abrem a Sessão 1 de novo (nova `requestKey` pelo `resume_count`); pausada com a Sessão 1 `ended` e a 01 aberta, Sessão 2 (aguarda a 01) e Sessão 3 Pronta → "Retomar" abre a Sessão 3, não a 1; com a sessão da pausa removida pela operadora, a escolha segue pela REQ-017 (US-04 cen. 4, REQ-028, B-09) · Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- O worker de sessões inicia as sessões do plano sozinho, uma por vez, e pausa com as mensagens exatas da spec.
- Nenhuma sessão do agente é aberta duas vezes para a mesma sessão do plano na mesma execução e retomada.
- `pnpm --dir packages/api typecheck` e `pnpm --dir packages/api lint` sem erros; `sessionLauncher.ts` e `sessionWorkerParts.ts` abaixo de 100 linhas.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- 2026-11-26 · 04.1 · `planRunSelection.ts` (`decidePlanRun`), `planRunPauseReasons.ts`, `planRunWorking.ts` (estados da 7.4: `opening`, `unconfirmed`, `running`, `asking`) · `vitest run src/application/services/plan-run/planRunSelection.test.ts` → 14 passaram · nota: `isActiveSession` conta `waiting` como ativa, por isso a 7.4 usa um conjunto próprio.
- 2026-11-26 · 04.2 · `launchSessionInput.ts` (união `ReviewLaunchInput | PlanItemLaunchInput`, `launchedPurpose`), `SessionLauncher.launch` chama `purposes.confirm` no `plan_item` (marca como o "Iniciar"), `planRunOpenRequestKey` (reusa `requestKeyOf`, agora exportado) · `vitest run … plan-run-launcher review-session-launcher` → 4 passaram; launcher com 78 linhas.
- 2026-11-26 · 04.3 · `PlanRunWorkerDao` (`listRunningForHost`, `agentWorking` com pedido pendente, `currentSession`), `PlanRunGuards`, `PlanRunPauser` · `vitest run … plan-run-guards` → 6 passaram · nota: "operadora mudou" é testado apagando a reivindicação, porque o banco não deixa trocar o operador de uma reivindicação.
- 2026-11-26 · 04.4 · `PlanRunStep`, `PlanRunStepStart`, `planRunLaunchMessage.ts`, `infra/planRunStepComposition.ts`, passo registrado em `sessionWorkerComposition.ts`; `sessionWorkerParts.ts` passou a devolver `database` (sem linhas novas) · `vitest run … plan-run-step plan-run-guards review-cycle-step` → passaram · desvio 1: achada uma corrida real (a sessão vira `waiting` antes da captura do `task_NN.md`, e a execução pausava como "tarefa aberta"); antes de qualquer pausa com sessão corrente, o passo força `recorder.captureStop` e decide de novo, como a revisão automática faz. Desvio 2: a mensagem do "Iniciar" para o serviço parado é "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo." (a spec citava outro texto, mas manda usar a do "Iniciar"). Desvio 3: no mundo do worker o heartbeat é sempre renovado, então o V-06j roda no worker com `checkout_missing` e o caso `session_service_offline` é provado no `planRunStepStart.test.ts` com o lançador dublado.
- 2026-11-26 · 04.5 · `vitest run … plan-run-resume plan-run-step plan-run-guards plan-run-launcher review-cycle-step` → 19 passaram, três execuções seguidas; typecheck sem erros.

