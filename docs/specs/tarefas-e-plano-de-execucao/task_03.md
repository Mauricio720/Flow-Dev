---
status: completed
title: Migration 0050 e catálogo de agentes
type: backend
complexity: high
---

# Task 03: Migration 0050 e catálogo de agentes

## Visão geral
Esta tarefa cria o esquema da feature. São duas tabelas do plano (`task_session_plans` e `task_session_plan_items`) e as colunas novas da sessão (`purpose`, `plan_item_id`, `agent`, `model`, `effort`), sem mexer nas tabelas legadas. Também cria o catálogo puro de agentes, modelos e esforços (7.4), com o padrão Claude Code · Opus · Máximo e a disponibilidade por agente (REQ-110), no formato que o spike V-33 fixou.

<critical>
- LEIA a spec (`docs/specs/tarefas-e-plano-de-execucao/spec.md`, §7.4, §14, §15, §20, REQ-094, REQ-109, REQ-110, NFR-16, DEC-28), o `docs/specs/tarefas-e-plano-de-execucao/v33-spike.md` (resultado da task_01) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- §14, a migration `0050_session_plans.sql` com o rollback `0050_session_plans_rollback.sql`:
  - **`task_session_plans`:**
    - `id` uuid PK;
    - `task_id` FK `tasks`, cascade e unique;
    - `tasks_folder` text;
    - `manifest_version` int;
    - `version` int ≥ 1;
    - `updated_by` FK `users`;
    - `updated_at`.
  - **`task_session_plan_items`:**
    - `id` uuid PK;
    - `plan_id` FK, cascade;
    - `position` int;
    - `task_ids` text[] com 1 a 30 itens no formato `task_NN`;
    - `agent` text, com check em `claude` e `codex`;
    - `model` text e `effort` text, de 1 a 64 caracteres;
    - `forced_by` FK `users` null e `forced_at` null;
    - `created_at`;
    - unique (`plan_id`, `position`).
  - **`task_terminal_sessions`** (colunas novas):
    - `purpose` text, com check em `route`, `generate_tasks` e `plan_item` e default `route`;
    - `plan_item_id` uuid null, FK `task_session_plan_items` com `ON DELETE SET NULL`;
    - `agent` text, com check em `claude` e `codex` e default `claude`;
    - `model` text null e `effort` text null.
- §14, dados existentes: sem backfill. As sessões atuais ficam com `purpose = route`, `agent = claude` e sem modelo.
- §20: o rollback apaga os planos e as colunas novas, e os artefatos ficam intactos.
- §9: `task_execution_plans` e `task_execution_runs` continuam intocadas.
- 7.4 / REQ-094 / REQ-109: Claude Code com Opus, Sonnet e Haiku, e os esforços Baixo, Médio, Alto, Muito alto e Máximo, menos as combinações que o V-33 recusou. O padrão é `{ agent: "claude", model: "opus", effort: "max" }`. Não há padrão por projeto.
- REQ-110: agente sem runtime registrado → indisponível com o motivo "O Codex ainda não conduz sessões no Flow Dev." (para o Codex).
- NFR-16: escolha validada no servidor contra a 7.4; um modelo de outro agente é recusado.

## Interfaces
- **Consome:** `v33-spike.md` (nomes exatos dos modelos e combinações recusadas); `packages/api/test/database.ts` (`applyMigration`), `packages/api/test/databaseMigrations.ts`, `test/terminal-tracking-support.ts` (`world`) e `test/session-interaction-support.ts` (`flowDevWorld`).
- **Produz** (usado pelas tasks 04, 05, 06 e 08):
  - as tabelas Drizzle `taskSessionPlans` e `taskSessionPlanItems` em `packages/api/src/infra/database/schema/tasks/sessionPlans.ts`, exportadas em `src/infra/database/schema.ts`, e as colunas `purpose`, `planItemId`, `agent`, `model` e `effort` em `taskTerminalSessions`;
  - `packages/api/src/application/terminal/sessionAgentCatalog.ts`:
    ```ts
    export const SESSION_AGENTS = ["claude", "codex"] as const;
    export type SessionAgent = (typeof SESSION_AGENTS)[number];
    export type AgentChoice = { agent: SessionAgent; model: string; effort: string };
    export type AgentAvailability = { agent: SessionAgent; available: boolean; reason: string | null; models: string[]; efforts: string[] };
    export const DEFAULT_SESSION_CHOICE: AgentChoice;
    export const AGENT_UNAVAILABLE_REASON: Record<SessionAgent, string>;
    export function agentAvailability(registered: ReadonlySet<SessionAgent>): AgentAvailability[];
    export function choiceProblem(choice: AgentChoice, registered: ReadonlySet<SessionAgent>): "choice_invalid" | "agent_unavailable" | null;
    ```

## Mini-tarefas

- [x] **03.1 — Migration 0050, rollback e esquema Drizzle**
  - **Arquivos:** `packages/api/drizzle/0050_session_plans.sql` e `0050_session_plans_rollback.sql` (criar), `packages/api/drizzle/meta/_journal.json` (entrada `idx: 50`), `packages/api/test/databaseMigrations.ts` (`"0050_session_plans"` no fim de `FEATURE_MIGRATIONS`), `packages/api/src/infra/database/schema/tasks/sessionPlans.ts` (criar), `packages/api/src/infra/database/schema/tasks/terminal.ts` (colunas novas), `packages/api/src/infra/database/schema.ts` (exportar), `packages/api/test/session-plans-migration.test.ts` (criar)
  - **Testes:** V-43a, V-43b, V-43c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-plans-migration.test.ts test/session-interaction-migration.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** `terminal.ts` já tem 68 linhas. Se passar de 100, mova as colunas novas para um helper de colunas no mesmo diretório, em vez de criar uma tabela nova.
- [x] **03.2 — Catálogo de agentes da sessão**
  - **Arquivos:** `packages/api/src/application/terminal/sessionAgentCatalog.ts` e `sessionAgentCatalog.test.ts` (criar)
  - **Testes:** V-44a, V-44b, V-44c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/terminal/sessionAgentCatalog.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- Espelhe `0048_session_interaction.sql` e o rollback dele: checks nomeados (`task_session_plan_items_agent_check`, `..._task_ids_check` com `cardinality(task_ids) between 1 and 30` e `task_ids <@`… ou um check por regex com `array_to_string`), índices e FKs.
- Os checks de `model` e `effort` são só de tamanho, de 1 a 64. O catálogo do Codex muda, e por isso a validação fica no servidor (§14).
- O rollback remove primeiro as colunas de `task_terminal_sessions` (a FK de `plan_item_id` antes), depois `task_session_plan_items` e `task_session_plans`.
- O catálogo é puro e não importa o SDK. Até a Spec E, o Codex não tem modelos no catálogo (`models: []`); a Spec E o alimenta pelo próprio Codex (7.12 da Spec E). `choiceProblem` devolve `agent_unavailable` quando o agente não está em `registered`, e `choice_invalid` quando o modelo ou o esforço não estão no catálogo do agente.
- Não reaproveite `application/agents/agentCatalog.ts`: ele é dos agentes de planejamento, tem outro padrão (`sonnet`/`low`) e outros esforços.

### Arquivos relevantes
- `packages/api/drizzle/0048_session_interaction.sql` e `_rollback.sql`: formato a espelhar.
- `packages/api/test/session-interaction-migration.test.ts`: teste de migração com `applyMigration(setup.client, ROLLBACK)` e reaplicação.
- `packages/api/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`: `EffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max'`.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-24 (escolha por sessão), DEC-25 (versão otimista, coluna `version`), DEC-28 (a sessão grava `agent`).

## Premissas
- Se o V-33 mostrar que um esforço só vale para alguns modelos, `AgentAvailability` ganha `effortsByModel: Record<string, string[]>` no lugar de `efforts`. Registre o desvio no log desta tarefa e na §15 da spec (Histórico).

## Testes atribuídos
- [x] V-43a: uma sessão da Spec C inserida com o rollback aplicado, e a 0050 reaplicada → a linha fica com `purpose = 'route'`, `agent = 'claude'`, `model`, `effort` e `plan_item_id` nulos · migração + Postgres
- [x] V-43b: plano com um item e um artefato com versão; aplicar o rollback → `task_session_plans` e `task_session_plan_items` não existem, `task_terminal_sessions` não tem `purpose`, e o artefato e a versão continuam · migração + Postgres
- [x] V-43c: `agent = 'gemini'`, `purpose = 'review'`, `task_ids` vazio ou com 31 itens, `model` com 65 caracteres, dois itens com a mesma `position` no mesmo plano, e dois planos para a mesma tarefa → todos recusados pelo banco; apagar a tarefa apaga o plano e os itens; apagar um item deixa a sessão com `plan_item_id` nulo · migração + Postgres
- [x] V-44a: `choiceProblem` com `{claude, opus, max}` → `null`; `{claude, gpt-6.1-sol, high}` → `choice_invalid`; `{claude, opus, turbo}` → `choice_invalid`; as combinações recusadas no `v33-spike.md` → `choice_invalid` · função pura
- [x] V-44b: `registered` só com `claude` → `agentAvailability` devolve o Codex com `available: false`, `reason: "O Codex ainda não conduz sessões no Flow Dev."` e `models: []`, e o Claude com `available: true`, os modelos `opus`, `sonnet`, `haiku` e os esforços aceitos; `choiceProblem({codex, gpt-6.1-sol, high})` → `agent_unavailable` · função pura
- [x] V-44c: `DEFAULT_SESSION_CHOICE` → `{ agent: "claude", model: "opus", effort: "max" }`, e `choiceProblem` dele com `claude` registrado → `null` · função pura

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando ao fim da tarefa (a suíte inteira roda com a 0050).
- `pnpm --dir packages/api typecheck` sem erros; `git diff` sem mudança em `taskExecutionPlans.ts` e `taskExecutionRuns.ts`.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- **2026-11-23 · 03.1** — **Desvio de numeração:** `0049_session_preparation` (correção da Spec C, com `prepared_at`) já ocupa o número 0049 e está no `_journal.json` (idx 49). A migration deste plano é a **`0050_session_plans.sql`** com o rollback `0050_session_plans_rollback.sql`, `idx: 50` no journal e `"0050_session_plans"` no fim de `FEATURE_MIGRATIONS`. A spec (§14, §20 e Histórico), o `_tasks.md` e as tarefas 03 e 09 foram atualizados. Criados `schema/tasks/sessionPlans.ts` (`taskSessionPlans`, `taskSessionPlanItems`), exportados por `schema/tasks/terminalTables.ts`, e as colunas `purpose`, `planItemId`, `agent`, `model`, `effort` em `terminal.ts` (78 linhas), com os checks `purpose`, `agent` e o índice parcial `task_terminal_sessions_plan_item_idx`. Os checks de `task_ids` usam `cardinality` de 1 a 30 e a regex `^task_[0-9]{2}(,task_[0-9]{2})*$` sobre `array_to_string(…, ',', '#')`, que também rejeita elementos nulos. A FK de `plan_item_id` tem o nome curto `task_terminal_sessions_plan_item_fk` (o nome gerado passaria dos 63 caracteres). `vitest run --config vitest.integration.config.ts test/session-plans-migration.test.ts test/session-interaction-migration.test.ts`: 11 testes passando (V-43a, V-43b, V-43c); typecheck sem erros. O V-43c prova o cascata com uma tarefa descartável, porque apagar a tarefa do mundo de teste esbarra nos `RESTRICT` de outras tabelas (a exclusão real passa pelo `deletionPurge`, task_04).
- **2026-11-23 · 03.2** — `application/terminal/sessionAgentCatalog.ts` (`SESSION_AGENTS`, `AgentChoice`, `AgentAvailability`, `DEFAULT_SESSION_CHOICE`, `AGENT_UNAVAILABLE_REASON`, `agentAvailability`, `choiceProblem`), com os nomes do `v33-spike.md` (`opus`, `sonnet`, `haiku`; `low`, `medium`, `high`, `xhigh`, `max`). O V-33 não recusou nenhuma combinação, então o catálogo é o produto cartesiano e `efforts` fica por agente (sem `effortsByModel`). O Claude indisponível usa a razão "O Claude Code não está disponível nesta máquina.". `vitest run src/application/terminal/sessionAgentCatalog.test.ts`: 20 testes passando (V-44a com as 15 combinações, V-44b, V-44c); typecheck sem erros.
- **2026-11-23 · fecho** — `pnpm --dir packages/api test`: 105 arquivos, 710 testes passando. `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`): 118 arquivos passando e 2 ignorados, 643 testes passando e 5 ignorados, 66 s. `pnpm --dir packages/api typecheck` sem erros. `git status` sem mudança em `taskExecutionPlans.ts` nem em `taskExecutionRuns.ts`.
