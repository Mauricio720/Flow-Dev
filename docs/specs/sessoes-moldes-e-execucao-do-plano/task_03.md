---
status: completed
title: "Execução do plano: registro, serviço e procedimentos run.*"
type: backend
complexity: high
---

# Task 03: Execução do plano: registro, serviço e procedimentos run.*

## Visão geral
Cria a execução do plano como registro próprio, com as transições por `revision`, e os procedimentos `tasks.plan.run.start`, `run.pause` e `run.resume` para a operadora. A visão do plano passa a trazer o estado da execução para todos. O worker que avança a execução fica na task_04.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use as skills `layered-backend` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-015: `run.start` DEVE rodar o pré-voo do "Iniciar" (serviço de sessões, clone da operadora, skills) e, se falhar, propagar o motivo (`session_service_offline`, `checkout_missing`, `checkout_invalid`, `skill_missing`) sem criar a execução.
- REQ-016: SE houver sessão sem tarefas, `run.start` DEVE recusar com `plan_run_session_empty` e "A Sessão N está sem tarefas. Adicione tarefas ou remova a sessão.".
- §15: sem sessão nunca iniciada → `plan_run_nothing_to_start` ("Não há sessão a executar no plano."); execução `running` ou `paused` → `plan_run_active` ("O plano já está em execução."); `revision` divergente → `plan_run_state` ("A execução mudou em outra aba. Recarregue.").
- 7.3: no máximo uma execução por plano; `completed` é reaproveitada com `resume_count` + 1 e volta a `running`. "Pausar" numa pausada e "Retomar" numa executando não mudam nada (devolvem a visão atual).
- B-01: `run.start` em duas abas → uma execução; a segunda com a mesma `requestKey` recebe a mesma visão, e com `requestKey` diferente recebe `plan_run_active`.
- REQ-027: `run.pause` grava `paused`, `paused_by` e o motivo "Pausada por <nome>" (a tela compõe o texto a partir de `pausedBy`).
- REQ-028: `run.resume` volta a `running` em nome de quem retomou (`started_by` passa a ser essa pessoa), com `resume_count` + 1 e `pause_reason` limpo.
- 7.5 e §18: `run.*` passam por `requirePlanOperator`; membro ou admin recebe `plan_control_denied`.
- REQ-029: `tasks.plan.get` DEVE trazer `run: PlanRunView | null` para todos que veem o plano.
- §19: `PlanLog` ganha `runStarted`, `runPaused`, `runResumed` (com `taskId` e `runId`); `runSessionStarted` e `runCompleted` são declarados aqui e usados na task_04.

## Interfaces
- **Consome:** tabela `task_session_plan_runs` e schema Drizzle `taskSessionPlanRuns` (task_02); `validatePlan`/`itemReadiness`/estado `empty` (task_01); `TerminalOpenGuard` (`assertServiceRunning`, `requireCheckout`, `assertSkills`); `requirePlanOperator`; `ExecutionPlanDao.find`.
- **Produz:**
  - `PlanRunRecord = { id; planId; taskId; projectId; hostId; startedBy: string; state: "running" | "paused" | "completed"; pauseReason: string | null; pausedBy: string | null; currentItemId: string | null; currentSessionId: string | null; resumeCount: number; revision: number; requestKey: string }`.
  - `PlanRunDao` em `packages/api/src/application/database/dao/planRunDao.ts`: `findByPlan(planId)`, `findByRequestKey(actorId, requestKey)`, `create(input)`, `restart({ runId, revision, startedBy, requestKey })`, `transition({ runId, revision, next })` → `PlanRunRecord | null`.
  - `PlanRunService` em `packages/api/src/application/services/plan-run/planRunService.ts`: `start({ projectId, taskId, actorId, requestKey })`, `pause({ taskId, actorId, revision })`, `resume({ taskId, actorId, revision })` → `PlanRunView`.
  - `PlanRunView = { state; reason: string | null; pausedBy: string | null; currentItemId: string | null; revision: number }` e `PlanView.run: PlanRunView | null`.
  - Procedimentos `tasks.plan.run.start({ projectId, taskId, requestKey })`, `tasks.plan.run.pause({ projectId, taskId, revision })`, `tasks.plan.run.resume({ projectId, taskId, revision })`.
  - Motivos novos em `PLAN_REASONS`: `plan_run_session_empty`, `plan_run_nothing_to_start`, `plan_run_active`, `plan_run_state`.

## Mini-tarefas

- [x] **03.1 — DAO da execução com transição por `revision`**
  - **Arquivos:** `packages/api/src/application/database/dao/planRunDao.ts` (criar), `packages/api/src/infra/database/dao/plans/drizzlePlanRunDao.ts` (criar), `packages/api/test/plan-run-dao.test.ts` (criar)
  - **Testes:** V-04a, V-04b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-run-dao.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** espelhe `DrizzleReviewCycleWorkerDao.transition` (update com `where revision = ?` e `revision + 1`, devolvendo `null` quando não casa).
- [x] **03.2 — `PlanRunService`: executar, pausar e retomar**
  - **Arquivos:** `packages/api/src/application/services/plan-run/planRunService.ts` (criar), `planRunStartChecks.ts` (criar), `planRunCopy.ts` (criar: mensagens da REQ-016 e afins), `planRunView.ts` (criar), `packages/api/test/plan-run-start.test.ts` (criar), `packages/api/test/plan-run-support.ts` (criar)
  - **Testes:** V-04c, V-04d, V-04e, V-04f, V-04g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-run-start.test.ts test/plan-run-dao.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** espelhe `ReviewCycleService.start` (`findByRequestKey` primeiro, pré-voo, `create` com captura da unique `plan_id` → `plan_run_active`). O guard é dublado só no `assertServiceRunning`/`assertSkills`; clone e banco são reais (veja `test/review-cycle-start.test.ts`).
- [x] **03.3 — Procedimentos `run.*`, motivos e `run` na visão**
  - **Arquivos:** `packages/api/src/routers/plan.ts`, `packages/api/src/schemas/plan.ts`, `packages/api/src/controllers/executionPlanController.ts`, `packages/api/src/controllers/planRunController.ts` (criar, se o controller atual passar de 100 linhas), `packages/api/src/infra/planComposition.ts`, `packages/api/src/application/services/tasks-set/planErrorCatalog.ts`, `planView.ts`, `planLog.ts`, `packages/api/test/plan-run-router.test.ts` (criar)
  - **Testes:** V-04h, V-04i
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-run-router.test.ts test/plan-read.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
A execução espelha a revisão automática: `ReviewCycleService` (start idempotente por `requestKey`, `hostId` desta máquina), `ReviewCycleController` (autorização antes do serviço) e `routers/review.ts` (sub-router). `run` é um sub-router de `tasks.plan` (`run: router({ start, pause, resume })`). O `hostId` vem da composição, como em `reviewComposition.ts`.

### Arquivos relevantes
- `packages/api/src/application/services/review/reviewCycleService.ts`: padrão de start, `constraintName`.
- `packages/api/src/application/services/review/reviewStartChecks.ts`: checagens em funções.
- `packages/api/src/infra/database/dao/review/` (ou onde estiver o `DrizzleReviewCycleWorkerDao`): `transition` por `revision`.
- `packages/api/test/review-cycle-start.test.ts` e `review-cycle-support.ts`: montagem do mundo de teste com guard dublado.

### Arquivos afetados
- `routers/plan.ts`, `schemas/plan.ts`, `executionPlanController.ts`, `planComposition.ts`, `planErrorCatalog.ts`, `planView.ts`, `planLog.ts`, e os arquivos novos de `plan-run/`.

### Decisões relacionadas
- DEC-02: a `revision` da execução é separada da `version` do plano; salvar e executar não se bloqueiam.
- §18: o controller exige a operadora; a tela só esconde os botões.

## Premissas
- "Pausada por <nome>" é composto na tela com `pausedBy` (nome da pessoa); o `pause_reason` fica nulo numa pausa manual. Assim o `pause_reason` guarda só os motivos do worker.

## Testes atribuídos
- [x] V-04a: execução criada com `revision` 1; `transition` com `revision` 1 → devolve a execução com `revision` 2; outra `transition` com `revision` 1 → `null` e nada muda · `DrizzlePlanRunDao` + Postgres
- [x] V-04b: dois `create` para o mesmo plano → o segundo falha na unique de `plan_id`; apagar o plano apaga a execução (cascata) · Postgres
- [x] V-04c: operadora com plano salvo (Sessão 1 com a 01) e pré-voo ok → `start` devolve `{ state: "running", revision: 1, currentItemId: null }`, com `host_id` desta máquina e `started_by` = operadora · `PlanRunService` + Postgres
- [x] V-04d: plano com a Sessão 2 vazia → `start` recusa `plan_run_session_empty` com "A Sessão 2 está sem tarefas. Adicione tarefas ou remova a sessão."; todas as sessões iniciadas → `plan_run_nothing_to_start`; nenhuma execução gravada · Postgres
- [x] V-04e: guard com o serviço offline → `start` recusa `session_service_offline` e nenhuma execução é gravada; sem clone vinculado → `checkout_missing` · Postgres, guard dublado no serviço
- [x] V-04f: duas chamadas de `start` com a mesma `requestKey` → uma execução e a mesma visão; com `requestKey` diferente e execução `running` → `plan_run_active` (B-01) · Postgres
- [x] V-04g: execução `completed` com `resume_count` 0 → `start` reaproveita a linha: `state: "running"`, `resume_count` 1; `pause` com a `revision` atual → `paused` e `paused_by`; `pause` repetido → mesma visão sem nova `revision`; `resume` → `running`, `started_by` = quem retomou, `resume_count` + 1; `pause` com `revision` velha → `plan_run_state` · Postgres
- [x] V-04h: membro do projeto chama `tasks.plan.run.start` → `FORBIDDEN` com `plan_control_denied`; nada gravado · caller tRPC + Postgres
- [x] V-04i: com execução pausada pela operadora, `tasks.plan.get` chamado por um membro → `run: { state: "paused", pausedBy: "<nome da operadora>", ... }`; sem execução → `run: null` · caller tRPC + Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `run.start`, `run.pause` e `run.resume` respondem pelo tRPC com os motivos e mensagens da §15.
- `pnpm --dir packages/api typecheck` e `pnpm --dir packages/api lint` sem erros; nenhum arquivo acima de 100 linhas.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- 2026-11-26 · 03.1 · `planRunDao.ts` (contrato, `PlanRunRecord` com `taskId`, `projectId` e `pausedByName` por junção) e `DrizzlePlanRunDao` (`restart` e `transition` por `revision`) · `vitest run --config vitest.integration.config.ts test/plan-run-dao.test.ts` → 2 passaram.
- 2026-11-26 · 03.2 · `PlanRunService` com `planRunStartChecks.ts`, `planRunCreation.ts`, `planRunCopy.ts`, `planRunView.ts`; motivos `plan_run_*` em `TaskErrorReason` e no catálogo; eventos `run_*` no `PlanLog`; `createPlanRunService` em `infra/planRunComposition.ts` (`createGuard` passou a ser exportado de `reviewComposition.ts`) · `vitest run … test/plan-run-start.test.ts` → 5 passaram · nota: "Retomar" limpa `current_item_id`/`current_session_id` para que o worker não pause de novo pela mesma sessão (REQ-028).
- 2026-11-26 · 03.3 · `PlanRunController` (novo, em vez de crescer o `ExecutionPlanController`), sub-router `tasks.plan.run`, extra `planRun` em `createTasksRouter`, `PlanView.run` pelo `runs.findByPlan` · `vitest run … plan-run-router plan-read plan-run-start plan-run-dao` → 15 passaram; typecheck sem erros.

