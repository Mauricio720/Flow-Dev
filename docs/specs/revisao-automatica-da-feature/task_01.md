---
status: completed
title: Migration dos ciclos de revisão
type: backend
complexity: high
---

# Task 01: Migration dos ciclos de revisão

## Visão geral
Cria as tabelas `task_review_cycles` e `task_review_rounds`, abre `task_terminal_sessions.purpose` para `review` e `review_execute` e liga a sessão ao ciclo por `review_cycle_id`. É o contrato de dados de que as tarefas 03, 04, 05 e 06 dependem; o rollback precisa funcionar com sessões das finalidades novas.

<critical>
- LEIA a spec (§14, §20, DEC-05) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`.claude/skills/software-testing/SKILL.md`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- §14: a migration DEVE criar `task_review_cycles` e `task_review_rounds` exatamente com as colunas, checks, unicidades e índices de §14, incluindo `step_role` (`review|execute`, não nulo, padrão `review`), acrescentada em 2026-11-25.
- §14: o check de `task_terminal_sessions.purpose` DEVE aceitar `review` e `review_execute`, e a coluna `review_cycle_id` (FK para `task_review_cycles`, `ON DELETE SET NULL`) DEVE existir.
- §14: nenhuma linha existente muda; trabalhos antigos não têm ciclo.
- §20 item 1: o rollback DEVE trocar as finalidades `review` e `review_execute` por `route`, apagar `review_cycle_id` e as duas tabelas.
- DEC-05 / §9: as tabelas `task_execution_*` da 0041 NÃO DEVEM mudar.

## Interfaces
- **Consome:** `task_session_plan_items` (checks de agente, modelo e esforço a copiar), `task_artifact_versions` (FK de `report_version_id`), `tasks` (FK de `task_id`), `task_terminal_sessions`.
- **Produz:**
  - `drizzle/0053_review_cycles.sql` e `drizzle/0053_review_cycles_rollback.sql`, com entrada em `drizzle/meta/_journal.json` e em `FEATURE_MIGRATIONS` de `test/databaseMigrations.ts`;
  - tabelas Drizzle `taskReviewCycles` e `taskReviewRounds` em `src/infra/database/schema/tasks/reviewCycles.ts`, exportadas pelo índice do schema;
  - coluna `reviewCycleId` na tabela Drizzle de `task_terminal_sessions`;
  - estados do ciclo `reviewing|executing|caveats|failed|approved|accepted|stopped`, ações pendentes `stop|retry|accept|fix`, vereditos `approved|caveats|rejected` como literais do check (os tipos TS ficam na 02).

## Mini-tarefas

- [x] **01.1 — Migration, rollback e schema Drizzle**
  - **Arquivos:** `packages/api/drizzle/0053_review_cycles.sql` (criar), `packages/api/drizzle/0053_review_cycles_rollback.sql` (criar), `packages/api/drizzle/meta/_journal.json` (alterar), `packages/api/test/databaseMigrations.ts` (alterar), `packages/api/src/infra/database/schema/tasks/reviewCycles.ts` (criar), schema de `task_terminal_sessions` e índice do schema (alterar)
  - **Testes:** nenhum novo além do typecheck; as constraints são provadas em 01.2.
  - **Pronto quando:** `pnpm --dir packages/api typecheck` sem erros; `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-plans-migration.test.ts` continua passando (a cadeia de migrations aplica a nova).
  - **Nota:** siga `packages/api/drizzle/MIGRATION.md` e espelhe `0050_session_plans.sql` e o rollback dela.
- [x] **01.2 — Prova das constraints, do rollback e das legadas**
  - **Arquivos:** `packages/api/test/review-cycles-migration.test.ts` (criar)
  - **Testes:** V-13a, V-13b, V-04i
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycles-migration.test.ts` passa; `test/session-plans-regression.test.ts` continua passando.

## Detalhes de implementação
Espelhe a 0050: migration com checks nomeados, rollback que desfaz na ordem inversa e teste de migração que aplica até antes da nova (`applyCurrentMigrations(client, stopBefore)`), insere dados, aplica a nova e confere. O índice único parcial em `(task_id)` com `state IN ('reviewing','executing','caveats','failed')` é o que garante "no máximo um ciclo não final por trabalho" (§7.1); prove-o no teste.

### Arquivos relevantes
- `packages/api/drizzle/0050_session_plans.sql` e `_rollback.sql`: padrão de checks e rollback.
- `packages/api/drizzle/MIGRATION.md`: como registrar.
- `packages/api/test/session-plans-migration.test.ts`: padrão do teste de migração.
- `packages/api/test/session-plans-regression.test.ts`: V-43e da Spec D, padrão de "legadas iguais".
- `packages/api/src/infra/database/schema/tasks/sessionPlans.ts`: checks de agente, modelo e esforço.

### Arquivos afetados
- `packages/api/test/databaseMigrations.ts`: `FEATURE_MIGRATIONS` ganha a nova.
- schema de `task_terminal_sessions`: `reviewCycleId`.

### Decisões relacionadas
- DEC-05 (spec §17): tabelas novas, legadas intactas.

## Premissas
- A migration é a **0053** (decisão da operadora em 2026-11-25): a 0052 fica para a Issue #6. Se a 0052 ainda não existir no journal quando esta tarefa rodar, registre no Registro de execução que há um buraco a fechar antes do merge.

## Testes atribuídos
- [ ] V-13a: colunas de `task_execution_plans`, `task_execution_runs`, `task_execution_actions` antes e depois da nova migration → idênticas (nome, tipo, nulidade, default) · Postgres de teste.
- [ ] V-13b: com uma sessão `review` e uma `review_execute` ligadas a um ciclo e uma rodada com `report_version_id`, aplicar o rollback → as duas sessões passam a `purpose = 'route'`, `review_cycle_id` deixa de existir, as tabelas novas somem; reaplicar a migration funciona · Postgres de teste.
- [ ] V-04i (constraints): segundo ciclo em `reviewing` para o mesmo `task_id` → violação do índice parcial; segundo ciclo com o primeiro em `approved` → aceito; mesma `(started_by, request_key)` → violação; `state = 'other'` ou `step_role = 'other'` → violação do check; `round = 0` → violação; rodada com mesmo `(cycle_id, number)` → violação; apagar o `task` → ciclos e rodadas apagados em cascata; apagar a sessão → `review_session_id` vira nulo · Postgres de teste.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Ao fim da tarefa: `pnpm --dir packages/api test:integration` completo passando uma vez.
- Typecheck e lint do pacote sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. -->
- 2026-11-25 · **01.1 concluída.** Criadas a migration 0053 e o rollback, tabelas Drizzle, coluna `reviewCycleId` e atualizados journal e catálogo de migrations. O journal já continha a 0054 local; inseri 0053 antes dela e desloquei seu índice, preservando a ordem; 0052 continua reservada para a Issue #6. Ajustei `session-plans-migration.test.ts` (fora da lista de arquivos) porque a asserção antiga rejeitava `purpose: review`, agora válido pela spec, e passei a rejeitar `other` e aceitar `review`. `pnpm --dir packages/api typecheck` → passou. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-plans-migration.test.ts` → 4 testes passaram.
- 2026-11-25 · **01.2 concluída.** Criado `review-cycles-migration.test.ts` para V-13a, V-13b e V-04i: preservação das colunas de execução, rollback/reaplicação, checks, unicidades, cascade e set null. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycles-migration.test.ts` → 3 testes passaram. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-plans-regression.test.ts` → 2 testes passaram; p95 de leitura 22 ms e gravação 50 ms.
- 2026-11-25 · **Task 01 concluída.** Ajustei `terminal-tracking-migration.test.ts` (fora da lista) para reverter 0053 antes do rollback 0047 e reaplicar 0053 depois, respeitando a FK nova de `report_version_id`; os 6 testes passaram. `pnpm --dir packages/api typecheck` → passou. `pnpm lint` → passou. `pnpm --dir packages/api test:integration` → 163 arquivos passaram, 2 ignorados; 795 testes passaram, 5 ignorados. A primeira execução completa teve 2 falhas de rollback corrigidas no teste acima e uma falha de latência sob carga concorrente; o teste de latência e a suíte completa isolados passaram.
