---
status: completed
title: Migration 0058 e gravação das sessões vazias e condições
type: backend
complexity: high
---

# Task 02: Migration 0058 e gravação das sessões vazias e condições

## Visão geral
Cria a migration da feature (sessões de 0 a 30 tarefas, tabela de condições e tabela da execução) e faz o salvamento gravar e reler sessões vazias e o `after`. Também faz o "Iniciar" manual respeitar a espera por sessões. Depois desta tarefa, o plano com moldes e condições funciona pela API.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- §14: `task_session_plan_items.task_ids_check` passa a `cardinality between 0 and 30`, com o padrão `^task_…$` só quando há itens.
- §14: tabela `task_session_plan_item_dependencies` (`item_id` e `after_item_id`, FKs para itens com `on delete cascade`, PK composta, check `item_id <> after_item_id`).
- §14: tabela `task_session_plan_runs` (`id`; `plan_id` FK cascade `unique`; `host_id`; `started_by` FK users; `state` check em `running`/`paused`/`completed`; `pause_reason`; `paused_by` FK nula; `current_item_id` FK nula `set null`; `current_session_id` FK nula para `task_terminal_sessions` `set null`; `resume_count`; `revision` check ≥ 1; `request_key` uuid; `created_at`; `updated_at`).
- §14 rollback: apaga as sessões vazias não iniciadas, as duas tabelas, e restaura a check de 1 a 30.
- §20: a migration vai antes do código; nenhum dado existente é convertido (P-3).
- REQ-006: remover uma sessão apaga as condições que apontavam para ela (cascata).
- REQ-008: sessões vazias são gravadas e continuam ao recarregar.
- REQ-009: a gravação mantém as condições corretas ao reordenar.
- REQ-013: o "Iniciar" de uma sessão com sessão de `after` não Concluída é recusado com `plan_item_blocked`, a menos que forçado (com o registro de quem forçou, D-REQ-102). Uma sessão `empty` não pode ser iniciada (`plan_item_not_ready`).
- Não muda (§9): sessão iniciada imutável, inclusive o `after`; "Iniciar", "Iniciar mesmo assim" e "Iniciar de novo" continuam.

## Interfaces
- **Consome:** `PlanItemDraft.after: number[]`, `StoredPlanItem.after: string[]`, `ItemReadiness.waitingSessions`, estado `empty` (task_01).
- **Produz:**
  - `packages/api/drizzle/0058_session_plan_runs.sql` e `0058_session_plan_runs_rollback.sql`.
  - Drizzle: `taskSessionPlanItemDependencies` e `taskSessionPlanRuns` em `packages/api/src/infra/database/schema/tasks/sessionPlans.ts` (ou `sessionPlanRuns.ts`, se passar de 100 linhas), exportados por `schema`.
  - `DrizzleExecutionPlanDao.find` devolve `after` por item, na ordem de posição.

## Mini-tarefas

- [x] **02.1 — Migration 0058 com rollback e schema Drizzle**
  - **Arquivos:** `packages/api/drizzle/0058_session_plan_runs.sql` (criar), `packages/api/drizzle/0058_session_plan_runs_rollback.sql` (criar), `packages/api/drizzle/meta/_journal.json`, `packages/api/test/databaseMigrations.ts`, `packages/api/src/infra/database/schema/tasks/sessionPlans.ts`, `packages/api/src/infra/database/schema/tasks/sessionPlanRuns.ts` (criar), índice do schema que reexporta as tabelas, `packages/api/test/session-plan-runs-migration.test.ts` (criar)
  - **Testes:** V-03a, V-03b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-plan-runs-migration.test.ts test/session-plans-migration.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** espelhe `test/session-plans-migration.test.ts` e `test/review-cycles-migration.test.ts` (aplicar até a anterior com `applyMigrationsAfter`, conferir checks, rodar o rollback).
- [x] **02.2 — Salvar e reler sessões vazias e `after`**
  - **Arquivos:** `packages/api/src/infra/database/dao/plans/drizzlePlanSave.ts`, `planItemDependencies.ts` (criar, na mesma pasta: grava e lê dependências), `drizzleExecutionPlanDao.ts`, `packages/api/test/plan-save-after.test.ts` (criar), `packages/api/test/plan-support.ts` (se precisar de helper)
  - **Testes:** V-03c, V-03d, V-03e, V-03f, V-03g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-save-after.test.ts test/plan-save.test.ts test/plan-save-rules.test.ts test/plan-save-concurrent.test.ts test/plan-read.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** `writeItem` precisa devolver o id de cada item (insert com `returning`) para mapear posição → id; as dependências dos itens não iniciados são apagadas e regravadas numa segunda passada, na mesma transação (§16). As do item iniciado ficam como estão.
- [x] **02.3 — "Iniciar" respeita a espera por sessões**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionPurpose.ts`, `purposePlanItem.ts`, `packages/api/test/terminal-open-plan-item-after.test.ts` (criar), `packages/api/test/plan-open-support.ts` (se precisar de helper)
  - **Testes:** V-02g, V-02h, V-11a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-open-plan-item-after.test.ts test/terminal-open-plan-item.test.ts test/terminal-open-plan-item-again.test.ts test/session-plans-regression.test.ts test/task-plan-journey.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** "bloqueada" passa a ser `blockedBy.length > 0 || waitingSessions.length > 0`; `requireStartable` também recusa `empty`.

## Detalhes de implementação
O padrão de gravação está em `drizzlePlanSave.ts` (`replaceItems` com `POSITION_OFFSET` para não colidir com a unique de posição). Os testes de integração clonam o banco-modelo por arquivo (`test/database.ts`); leia `test/plan-save.test.ts` e `test/plan-support.ts` antes de escrever os novos.

### Arquivos relevantes
- `packages/api/drizzle/0050_session_plans.sql` e `0053_review_cycles.sql`: formato das migrations escritas à mão.
- `packages/api/test/databaseMigrations.ts`: lista `FEATURE_MIGRATIONS`, onde a nova entra.
- `packages/api/src/infra/database/dao/plans/planItemSessions.ts`: como "iniciada" é derivado de `task_terminal_sessions.started_at`.

### Arquivos afetados
- Migration, schema Drizzle, `drizzlePlanSave.ts`, `drizzleExecutionPlanDao.ts`, `sessionPurpose.ts`, `purposePlanItem.ts`.

### Decisões relacionadas
- DEC-02: execução em tabela 1:1 com o plano (só a tabela aqui; o uso fica na task_03).
- DEC-03: condições em tabela de ligação com cascata.
- DEC-04: `after` por posição no save.

## Premissas
- A 0056 e a 0057 existem no checkout principal e entram antes desta branch; por isso a migration é a 0058. Se outra branch ocupar o número, use o próximo livre e registre aqui e em `_tasks.md`.

## Testes atribuídos
- [x] V-03a: banco migrado até a 0058 → insert de item com `task_ids = '{}'` aceito; `'{task_1}'` recusado pela check; dependência com `item_id = after_item_id` recusada; apagar um item apaga as dependências dele e as que apontam para ele · Postgres de teste
- [x] V-03b: rollback da 0058 com um plano que tem uma sessão vazia não iniciada e uma com tarefas → roda sem erro, a vazia some, a outra fica, e as tabelas `task_session_plan_item_dependencies` e `task_session_plan_runs` não existem · Postgres de teste
- [x] V-03c: save novo com Sessão 1 (01), Sessão 2 vazia e Sessão 3 (02) com `after: [1, 2]` → `find` devolve a Sessão 2 com `taskIds: []` e a Sessão 3 com `after` = [id da Sessão 1, id da Sessão 2] · `PlanSaveService` + Postgres
- [x] V-03d: plano salvo com Sessão 3 `after` = Sessão 1; save que move a Sessão 3 para a posição 2 com `after: [1]` → `find` mostra a ordem nova e o `after` ainda apontando para o id da antiga Sessão 1 · Postgres
- [x] V-03e: plano com Sessão 3 `after` = Sessão 2; save sem a Sessão 2 → a Sessão 3 fica com `after: []` · Postgres
- [x] V-03f: Sessão 2 com a 02 e a 03; save com a Sessão 2 vazia → ao reler, a Sessão 2 continua com `taskIds: []`, e `buildPlanView` lista a 02 e a 03 em `unassigned` (US-01 cen. 3) · Postgres
- [x] V-03g: Sessão 1 iniciada com `after: []` e save que tenta `after` diferente nela → recusado com `plan_item_started` e nada gravado (versão igual) · Postgres
- [x] V-02g: Sessão 3 com `after` = Sessão 1 (01 `pending`) → `open` com `plan_item` recusa com `plan_item_blocked`; com `force: true` abre e grava `forced_by` · `open` do terminal (`tasks.terminal.open` pelo controller) + Postgres
- [x] V-02h: sessão vazia → `open` com `plan_item` recusa com `plan_item_not_ready` · Postgres
- [x] V-11a: `terminal-open-plan-item*.test.ts`, `session-plans-regression.test.ts`, `task-plan-journey.test.ts` e os testes de save atuais passam sem mudar o oráculo · Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Sessões vazias e condições sobrevivem ao reload; remover uma sessão limpa as condições pela cascata.
- A migration e o rollback rodam no banco de teste.
- `pnpm --dir packages/api typecheck` e `pnpm --dir packages/api lint` sem erros.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- 2026-11-26 · 02.1 · `0058_session_plan_runs.sql` + rollback, journal e `FEATURE_MIGRATIONS`, `taskSessionPlanItemDependencies` (em `sessionPlans.ts`) e `taskSessionPlanRuns` (`sessionPlanRuns.ts`), reexportados por `terminalTables.ts` · `vitest run --config vitest.integration.config.ts test/session-plan-runs-migration.test.ts test/session-plans-migration.test.ts` → 6 passaram · desvio: no teste da 0050, o V-43c deixou de esperar recusa para `taskIds: []` (REQ-008), e o V-43a/b rodam antes o rollback da 0058, porque as tabelas novas referenciam os itens.
- 2026-11-26 · 02.2 · `planItemDependencies.ts` (`rewriteDependencies`, `dependenciesOf`), `writeItem` devolve o id, segunda passada na mesma transação, `find` lê o `after` na ordem de posição · `vitest run … plan-save-after plan-save plan-save-rules plan-save-concurrent plan-read` → 22 passaram · desvio: o V-36a de `plan-read.test.ts` ganhou `after: [], waitingSessions: []` no objeto esperado (campos novos, sem mudar o comportamento).
- 2026-11-26 · 02.3 · bloqueio inclui `waitingSessions`, `requireStartable` recusa `empty` · `vitest run … terminal-open-plan-item-after terminal-open-plan-item terminal-open-plan-item-again session-plans-regression task-plan-journey` → 13 passaram; typecheck sem erros.

