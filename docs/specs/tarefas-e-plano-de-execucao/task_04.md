---
status: pending
title: "Plano de execução: regras e salvamento"
type: backend
complexity: high
---

# Task 04: Plano de execução: regras e salvamento

## Visão geral
Esta tarefa entrega o plano no servidor. São as regras puras (ordem, limites, sessões iniciadas imutáveis), o estado de cada sessão do plano (pronta, bloqueada, em execução, encerrada, concluída), a reconciliação quando o manifesto muda, e as procedures `tasks.plan.get` e `tasks.plan.save`, com versão otimista e autorização. A abertura das sessões do plano fica na task_05, e a tela na task_08.

<critical>
- LEIA a spec (`docs/specs/tarefas-e-plano-de-execucao/spec.md`, §6 REQ-092–100, REQ-105, REQ-107, REQ-108, §7.5, §7.7, §7.8, §8 B-36 e B-39, §15, §16 "Salvar o plano", DEC-25, §19) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use as skills `layered-backend` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-092: o plano é uma lista ordenada de sessões; cada uma tem de 1 a 30 tarefas, um agente, um modelo e um esforço. Cada tarefa fica em no máximo uma sessão. Há até 30 sessões (7.8).
- REQ-095: dentro da sessão, as tarefas ficam na ordem das dependências e, sem dependência entre elas, na ordem do número. Se uma tarefa ficar numa sessão anterior à de uma dependência dela, o salvamento é recusado com "A tarefa 02 depende da 01, que está numa sessão posterior." (com os números reais).
- REQ-096: uma sessão iniciada não muda de tarefas, agente, modelo nem esforço, e não é removida. As não iniciadas podem ser editadas, reordenadas, juntadas e removidas.
- REQ-097: quando o `_tasks.md` ganha uma versão depois do salvamento:
  - as tarefas novas aparecem em "Sem sessão";
  - as removidas saem das sessões não iniciadas, e as sessões que ficam vazias somem;
  - `stale: true` até o próximo salvamento.
- REQ-098: salvamento com `version` velha → `plan_conflict`, sem mudar nada.
- REQ-099: tarefas fora de qualquer sessão aparecem em `unassigned`, na ordem do manifesto.
- REQ-100 / 7.5:
  - **ready:** sem execução em andamento, e todas as dependências externas das tarefas da sessão concluídas;
  - **blocked:** alguma dependência externa aberta, com cada tarefa que falta e o status dela em `blockedBy`;
  - **running:** a sessão mais recente ligada ao item não está num estado final;
  - **ended:** a sessão mais recente terminou com alguma tarefa do item não concluída;
  - **done:** todas as tarefas do item estão concluídas.
- 7.5 / B-39: o item conta como `started` quando alguma sessão ligada a ele chegou a começar (`started_at` preenchido). Uma sessão que só deu "Falhou ao abrir" não conta.
- REQ-105: as tarefas a repetir em "Iniciar de novo" são só as não concluídas do item (função pura, consumida pela task_05).
- REQ-107 / 7.7 / B-36: só a pessoa operadora atual salva (`plan_control_denied`). Quem vê a tarefa lê o plano, com `canEdit: false`.
- REQ-108: a exclusão da Issue apaga o plano e os itens.
- NFR-16: o servidor valida `task_ids` contra o conjunto atual, e a escolha contra a 7.4 (`choice_invalid`, `agent_unavailable`).
- §19: logs `[plan] saved` (número de sessões e de tarefas, sem conteúdo) e `[plan] conflict`.
- Erros do `save` (spec §15): `plan_conflict`, `plan_invalid_order`, `plan_task_unknown`, `plan_task_duplicated`, `plan_item_started`, `plan_limits`, `task_set_unavailable` (sem conjunto ou manifesto inválido), `plan_control_denied` e, pela V-44, `choice_invalid` e `agent_unavailable`.

## Interfaces
- **Consome:**
  - da task_02: `TaskSet`, `TaskSetTask` e `TaskStatus` (`src/application/services/tasks-set/taskSetTypes.ts`), e `TaskSetController.get`, ou a mesma composição de `TaskSetReadDao` + `readTaskSet`;
  - da task_03: as tabelas `taskSessionPlans` e `taskSessionPlanItems`, as colunas `planItemId` e `startedAt` de `taskTerminalSessions`, e `AgentChoice`, `choiceProblem` e `SessionAgent` de `src/application/terminal/sessionAgentCatalog.ts`;
  - existente: `WorkAuthorization.requireOperate` e `requireRead`; `isActiveSession` (`src/application/terminal/terminalSessionStatus.ts`); `CLEANUP_STEPS` (`src/infra/database/dao/issue-deletion/deletionPurge.ts`).
- **Produz** (usado pelas tasks 05 e 08):
  - `src/application/services/tasks-set/planTypes.ts`:
    ```ts
    export type PlanItemState = "ready" | "blocked" | "running" | "ended" | "done";
    export type PlanItemDraft = { id?: string; taskIds: string[]; choice: AgentChoice };
    export type StoredPlanItem = { id: string; position: number; taskIds: string[]; choice: AgentChoice; forced: { by: string; at: Date } | null; started: boolean; latestSession: { id: string; status: TerminalSessionStatus } | null };
    export type StoredPlan = { id: string; version: number; tasksFolder: string; manifestVersion: number; items: StoredPlanItem[] };
    ```
  - `validatePlan(input: { set: TaskSet; stored: StoredPlanItem[]; drafts: PlanItemDraft[] }): { items: PlanItemDraft[] } | { error: PlanError; message?: string }` em `planRules.ts`;
  - `itemReadiness(item: StoredPlanItem, set: TaskSet): { state: PlanItemState; blockedBy: Array<{ taskId: string; status: TaskStatus }> }` e `remainingTasks(item, set): string[]` em `planReadiness.ts`;
  - `reconcilePlan(plan: StoredPlan, set: TaskSet): { items: StoredPlanItem[]; unassigned: string[]; stale: boolean }` em `planReconciliation.ts`;
  - a porta `ExecutionPlanDao` (`src/application/database/dao/executionPlanDao.ts`) com `find(taskId)`, `save(input)` (devolve `{ version }` ou `"conflict"`) e `markForced({ itemId, by, at })`, este usado pela task_05;
  - `ExecutionPlanController.get` e `.save`, e as procedures `tasks.plan.get` e `tasks.plan.save`, no formato da §15.

## Mini-tarefas

- [ ] **04.1 — Regras do salvamento (`planRules`)**
  - **Arquivos:** `packages/api/src/application/services/tasks-set/planTypes.ts`, `planRules.ts`, `planOrder.ts` (ordem por dependência e número) e `planRules.test.ts` (criar)
  - **Testes:** V-35a, V-35b, V-35c, V-35d, V-35e, V-35f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks-set/planRules.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [ ] **04.2 — Prontidão, estados e reconciliação**
  - **Arquivos:** `packages/api/src/application/services/tasks-set/planReadiness.ts`, `planReadiness.test.ts`, `planReconciliation.ts` e `planReconciliation.test.ts` (criar)
  - **Testes:** V-35g, V-35h, V-35i, V-35j, V-35k, V-35l, V-35m, V-35n
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks-set/planReadiness.test.ts src/application/services/tasks-set/planReconciliation.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [ ] **04.3 — `ExecutionPlanDao`, `tasks.plan.get` e exclusão**
  - **Arquivos:** `packages/api/src/application/database/dao/executionPlanDao.ts` (criar), `packages/api/src/infra/database/dao/plans/drizzleExecutionPlanDao.ts` e `planItemSessions.ts` (sessão mais recente e `started` por item) (criar), `packages/api/src/controllers/executionPlanController.ts` (criar, só `get`), `packages/api/src/schemas/plan.ts`, `packages/api/src/routers/plan.ts` e `packages/api/src/infra/planComposition.ts` (criar), `packages/api/src/routers/tasks.ts` (montar `plan` e aceitar `extras.plan`), `packages/api/src/infra/database/dao/issue-deletion/deletionPurge.ts` (passos `task_session_plan_items` e `task_session_plans` antes de `task_terminal_sessions`), `packages/api/test/plan-read.test.ts` e `packages/api/test/plan-support.ts` (criar), `packages/api/test/issue-deletion-terminal.test.ts` (caso novo)
  - **Testes:** V-36a, V-36b, V-36c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-read.test.ts test/issue-deletion-terminal.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [ ] **04.4 — `tasks.plan.save` com versão otimista**
  - **Arquivos:** `packages/api/src/controllers/executionPlanController.ts` (`save`), `packages/api/src/application/services/tasks-set/planSaveLog.ts` (criar, logs `[plan]`), `packages/api/src/application/services/tasks/taskErrors.ts` e o mapper de erros usado pelo router (`plan_*`, `task_set_unavailable`, `choice_invalid`, `agent_unavailable`), `packages/api/src/infra/database/dao/plans/drizzleExecutionPlanDao.ts` (`save`), `packages/api/test/plan-save.test.ts` (criar)
  - **Testes:** V-36d, V-36e, V-36f, V-36g, V-36h, V-36i, V-44d
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-save.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- Fluxo do `save` (spec §16):
  1. `requireOperate` (falha → `plan_control_denied`);
  2. lê o conjunto atual (sem conjunto, ou com `problem` → `task_set_unavailable`);
  3. lê o plano e reconcilia;
  4. `validatePlan`;
  5. `choiceProblem` em cada item novo ou alterado, com os agentes registrados (até a task_05 existir, a composição passa `new Set(["claude"])`; a task_05 troca pela lista do registro de runtimes);
  6. transação: `UPDATE task_session_plans SET version = version + 1 … WHERE task_id = :taskId AND version = :version`. Zero linhas → `plan_conflict`. Plano inexistente com `version: 0` → `INSERT` com `version = 1`;
  7. substitui os itens não iniciados, mantém os iniciados (com o mesmo `id`) e renumera as posições a partir de 1, numa ordem só. Grava `tasks_folder` e `manifest_version` com os valores atuais (isso zera o `stale`).
- `PlanItemDraft.id` identifica um item existente. Um item iniciado tem de vir com o mesmo `id`, as mesmas tarefas e a mesma escolha. Se vier diferente, ou se não vier, → `plan_item_started`.
- A mensagem de `plan_invalid_order` é o texto exato da REQ-095, com os números (`"02"`, `"01"`), como `message` do erro tRPC, para a tela mostrar sem montar de novo.
- `forced.by` no `plan.get` é o nome de exibição da pessoa (join em `users`), porque a tela mostra "Iniciada com dependências abertas por Ana às 15:10" (US-14.3).
- `canEdit` no `get` = a pessoa passa em `requireOperate`, sem lançar, como `sessionControlAuthorization.ts` faz para os controles da sessão.
- Para descobrir a sessão mais recente e o `started` de cada item, use uma consulta só, com `plan_item_id IN (...)`, `max(created_at)` e `bool_or(started_at is not null)`. Assim não há N+1, e a NFR-15 é medida na task_09.
- A reconciliação roda no `get`: o `get` não grava. Ela só é persistida no próximo `save`.
- `stale` compara o grafo (`nodes` e `edges`) da versão `manifest_version` do `_tasks.md`, que continua guardada em `task_artifact_versions`, com o grafo da versão atual. Uma versão nova que só mudou a tabela "Estado" ou o texto não deixa o plano `stale`. A `StoredPlan` ganha `savedGraph`, lido pelo DAO junto com o plano.

### Arquivos relevantes
- `packages/api/src/controllers/taskArtifactController.ts` e `src/infra/artifactComposition.ts`: padrão de controller e composição.
- `packages/api/src/application/services/terminal/sessionControlAuthorization.ts`: como saber se a pessoa opera sem lançar.
- `packages/api/test/issue-deletion-terminal.test.ts` e `issue-deletion-support.ts`: exclusão com sessões.
- `packages/api/test/terminal-harness.ts`: caller tRPC dos testes.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-25 (spec §17): plano salvo inteiro, com versão otimista.

## Premissas
- "Encerrada" e "Iniciar de novo", plano inexistente com `version: 0`, e `stale` pelo grafo e não pela versão: ver `_tasks.md`, "Premissas e bloqueios".

## Testes atribuídos
- [ ] V-35a: 02 depende de 01; 01 na sessão 2 e 02 na sessão 1 → `plan_invalid_order` com "A tarefa 02 depende da 01, que está numa sessão posterior." · função pura
- [ ] V-35b: 02 em duas sessões → `plan_task_duplicated` · função pura
- [ ] V-35c: `task_09` fora do conjunto → `plan_task_unknown` · função pura
- [ ] V-35d: sessão sem tarefas, sessão com 31 tarefas, ou 31 sessões → `plan_limits`; 30 sessões de uma tarefa → aceito · função pura
- [ ] V-35e: item iniciado com outra tarefa, com outro modelo, ou ausente dos rascunhos → `plan_item_started`; item não iniciado trocado de posição e juntado a outro → aceito · função pura
- [ ] V-35f: sessão com `[task_03, task_02, task_01]`, em que 02 depende de 01 → normalizada para `[task_01, task_02, task_03]`; com 01 dependendo de 03 → `[task_02, task_03, task_01]` · função pura
- [ ] V-35g: item com `[task_02]`, em que 02 depende de 01 (fora do item) e 01 está `completed` → `ready`, `blockedBy: []`; 01 `in_progress` → `blocked`, `blockedBy: [{ taskId: "task_01", status: "in_progress" }]`; 01 e 02 no mesmo item com 01 `pending` → `ready` · função pura
- [ ] V-35h: sessão mais recente `running` → `running`; `ended` com 1 de 2 tarefas concluída → `ended`; todas as tarefas `completed` → `done`, qualquer que seja a sessão · função pura
- [ ] V-35i: sessão `ended` com a dependência externa ainda aberta → `ended`, com `blockedBy` preenchido (o "Iniciar de novo" exige `force`) · função pura
- [ ] V-35j: única sessão ligada em `launch_failed` sem `started_at` → `started: false` (B-39), e o item continua editável em `validatePlan`; uma sessão com `started_at` → `started: true` · função pura
- [ ] V-35k: plano salvo na versão 1 do manifesto com 01–03; a versão 2 acrescenta `task_04` e remove `task_03` → `task_04` em `unassigned`, `task_03` fora da sessão não iniciada, a sessão que ficou vazia removida, `stale: true` · função pura
- [ ] V-35l: `task_03` removida do manifesto, mas numa sessão iniciada → continua na sessão iniciada; versão nova do manifesto com o mesmo grafo e só a tabela "Estado" mudada → `stale: false` · função pura
- [ ] V-35m: item `[task_01, task_02]` com 01 `completed` e 02 `in_progress` → `remainingTasks` devolve `["task_02"]` · função pura
- [ ] V-35n: conjunto 01–04 com 01 e 03 em sessões → `unassigned: ["task_02", "task_04"]`, na ordem do manifesto · função pura
- [ ] V-36a: plano salvo com duas sessões → `plan.get` devolve `version`, os itens em ordem com `choice`, `state`, `blockedBy`, `started`, `forced: null` e `latestSessionId`; membro com acesso lê com `canEdit: false`, e a operadora com `canEdit: true` · controller + Postgres
- [ ] V-36b: sem plano → `plan.get` devolve `version: 0`, `items: []` e todas as tarefas em `unassigned` · controller + Postgres
- [ ] V-36c: Issue com plano, itens e uma sessão ligada a um item; exclusão pelo `deletionPurge` → nenhuma linha em `task_session_plans` nem em `task_session_plan_items` da tarefa (REQ-108) · purge + Postgres
- [ ] V-36d: duas leituras na versão 1; a primeira salva (versão 2); a segunda salva com `version: 1` → `plan_conflict`, e os itens no banco são os da primeira; o log tem `[plan] conflict` (REQ-098) · controller + Postgres
- [ ] V-36e: "Uma sessão por tarefa" salva, com a Sessão 3 trocada para `sonnet`/`high` → ao recarregar, três itens: 1 e 2 em `opus`/`max`, 3 em `sonnet`/`high`, posições 1, 2 e 3, `version: 2` (US-13.2) · controller + Postgres
- [ ] V-36f: item com uma sessão ligada que tem `started_at`; `save` que troca o modelo desse item → `plan_item_started`, nada muda · controller + Postgres
- [ ] V-36g: `save` com `{ agent: "claude", model: "gpt-6.1-sol", effort: "high" }` → `choice_invalid`; com esforço `turbo` → `choice_invalid` (NFR-16) · controller + Postgres
- [ ] V-36h: membro com acesso que não é operador → `plan_control_denied`; a ex-operadora depois da troca de operadora → `plan_control_denied`, e a nova operadora salva (B-36) · controller + Postgres
- [ ] V-36i: tarefa sem `_tasks.md`, ou com manifesto sem `graph` → `task_set_unavailable` · controller + Postgres
- [ ] V-44d: `save` com `{ agent: "codex", model: "gpt-6.1-sol", effort: "high" }` e só o Claude registrado → `agent_unavailable`, nada salvo · controller + Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando ao fim da tarefa.
- `pnpm --dir packages/api typecheck` sem erros.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
