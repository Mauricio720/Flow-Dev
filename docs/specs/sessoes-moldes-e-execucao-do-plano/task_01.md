---
status: completed
title: "Regras do plano: sessões vazias, condições e espera por sessões"
type: backend
complexity: high
---

# Task 01: Regras do plano: sessões vazias, condições e espera por sessões

## Visão geral
Ensina às regras puras do plano que uma sessão pode estar vazia e pode "começar depois de" sessões anteriores, e que uma sessão fica Bloqueada enquanto essas sessões não estão Concluídas. É o contrato que a gravação (02), a execução (03, 04) e a tela (05) consomem.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use as skills `layered-backend` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-008 (regras): o sistema DEVE aceitar sessões sem tarefas, e a reconciliação com um manifesto novo NÃO DEVE descartar uma sessão não iniciada que ficou vazia (muda a D-REQ-097).
- REQ-011: SE uma sessão começar depois de outra que vem depois dela na ordem, ENTÃO o save DEVE ser recusado com `plan_after_order` e a mensagem "A Sessão N começa depois da Sessão M, que vem depois dela na ordem." (numeração do rascunho).
- REQ-012 (visão): a visão DEVE expor `after` (ids) e `waitingSessions` (ids de `after` não Concluídas) por sessão.
- REQ-013 (regra): uma sessão nunca iniciada com sessão de `after` não Concluída DEVE ficar `blocked`.
- 7.1: sessão não iniciada e vazia tem o estado `empty` e não conta como Concluída.
- 7.2: Pronta = tarefas externas Concluídas E sessões de `after` Concluídas (todas as tarefas delas Concluídas). Uma sessão "Encerrada" com tarefa aberta não satisfaz.
- 7.6: de 0 a 30 tarefas por sessão; até 30 sessões; `after` é qualquer subconjunto das anteriores.
- Não muda (§9): a recusa "A tarefa NN depende da MM, que está numa sessão posterior."; cada tarefa em uma só sessão; sessão iniciada imutável, agora incluindo `after` (`plan_item_started`).

## Interfaces
- **Consome:** `validatePlan`, `findOrderProblem`, `itemReadiness`, `remainingTasks`, `reconcilePlan`, `buildPlanView`, `PLAN_REASONS` (todos em `packages/api/src/application/services/tasks-set/`); `planSaveInputSchema` (`packages/api/src/schemas/plan.ts`).
- **Produz:**
  - `PlanItemDraft = { id?: string; taskIds: string[]; choice: AgentChoice; after: number[] }` (posições 1-based de itens anteriores do mesmo save).
  - `StoredPlanItem` ganha `after: string[]` (ids de itens).
  - Na saída de `validatePlan`, cada item válido carrega `after: number[]` já validado.
  - `PlanItemState = "ready" | "blocked" | "running" | "ended" | "done" | "empty"`.
  - `ItemReadiness = { state; blockedBy: BlockedBy[]; waitingSessions: string[] }` e `itemReadiness(item: StoredPlanItem, context: { set: TaskSet; items: StoredPlanItem[] })`.
  - `PlanItemView` ganha `after: string[]` e `waitingSessions: string[]`.
  - `PlanError` e `PLAN_REASONS` ganham `plan_after_order` (BAD_REQUEST, mensagem no campo `message`).
  - Item do `planSaveInputSchema`: `after: z.array(z.number().int().min(1)).max(30).default([])`.

## Mini-tarefas

- [x] **01.1 — Validação aceita sessão vazia e `after` só para trás**
  - **Arquivos:** `packages/api/src/application/services/tasks-set/planTypes.ts`, `planRules.ts`, `planAfterRules.ts` (criar), `planAfterRules.test.ts` (criar), `planRules.test.ts`, `planErrorCatalog.ts`, `packages/api/src/schemas/plan.ts`, `packages/api/src/infra/database/dao/plans/drizzleExecutionPlanDao.ts` (preenche `after: []` até a 02.2)
  - **Testes:** V-01a, V-01b, V-01c, V-01d, V-01e, V-01f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks-set/planRules.test.ts src/application/services/tasks-set/planAfterRules.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** a mensagem de `plan_limits` passa a "O plano aceita até 30 sessões, cada uma com até 30 tarefas." (7.6). `planAfterRules` roda por último no `validatePlan` (§16, item 6), e o item iniciado compara também o `after` (convertido de posições para ids pelo `stored`).
- [x] **01.2 — Prontidão com espera por sessões e estado "Sem tarefas"**
  - **Arquivos:** `planReadiness.ts`, `planReadiness.test.ts`, `planReconciliation.ts`, `planReconciliation.test.ts`, `packages/api/src/application/services/terminal/purposePlanItem.ts` (passa `items` ao `itemReadiness`), `planFixture.ts` (se precisar de `after` nos fixtures)
  - **Testes:** V-02a, V-02b, V-02c, V-02d, V-02e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks-set/planReadiness.test.ts src/application/services/tasks-set/planReconciliation.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** a sessão vazia retorna `empty` antes do teste de `done`. Se `planReadiness.ts` passar de 100 linhas, extraia a espera por sessões para `planSessionWaits.ts`.
- [x] **01.3 — Visão do plano com `after` e `waitingSessions`**
  - **Arquivos:** `planView.ts`, `planView.test.ts` (criar)
  - **Testes:** V-02f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks-set/planView.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
Espelhe o estilo de `planRules.ts` (funções pequenas, `validatePlan` como orquestrador). `findOrderProblem` (`planOrder.ts`) mostra como a mensagem com números do rascunho é montada. A posição do rascunho é o índice + 1 no array do save; a validação de `after` é: cada posição existe, é menor que a do próprio item e não se repete.

### Arquivos relevantes
- `packages/api/src/application/services/tasks-set/planOrder.ts`: montagem da mensagem de ordem das tarefas, a espelhar.
- `packages/api/src/application/services/tasks-set/planFixture.ts`: fixtures dos testes puros.
- `packages/api/src/application/terminal/terminalSessionStatus.ts`: `isActiveSession`.

### Arquivos afetados
- `planTypes.ts`, `planRules.ts`, `planAfterRules.ts`, `planReadiness.ts`, `planReconciliation.ts`, `planView.ts`, `planErrorCatalog.ts`, `schemas/plan.ts`, `purposePlanItem.ts`, `drizzleExecutionPlanDao.ts`.

### Decisões relacionadas
- DEC-04 (spec §17): `after` vai por posição no save e o servidor converte em ids.
- DEC-03: a ordem relativa é validada no serviço, não no banco.

## Premissas
- Até a 02.2, o DAO devolve `after: []` para os itens gravados; a gravação ignora `after`. O sistema continua funcionando com os planos atuais (P-3).

## Testes atribuídos
- [x] V-01a: drafts com uma sessão de `taskIds: []` e outra com a 01 → `validatePlan` retorna os dois itens, sem erro · `validatePlan` pura
- [x] V-01b: Sessão 3 com `after: [1]` → aceito, e o item válido mantém `after: [1]` · pura
- [x] V-01c: Sessão 2 com `after: [3]` → `{ error: "plan_after_order", message: "A Sessão 2 começa depois da Sessão 3, que vem depois dela na ordem." }` · pura
- [x] V-01d: Sessão 1 com `after: [1]` (ela mesma) e posição inexistente `[9]` → `plan_after_order` · pura
- [x] V-01e: a 02 (depende da 01) na Sessão 1 e a 01 na Sessão 2 → `plan_invalid_order` com "A tarefa 02 depende da 01, que está numa sessão posterior." (regra de posição inalterada) · pura
- [x] V-01f: item iniciado com `after` gravado `[id da Sessão 1]` e draft com `after: []` → `plan_item_started`; sessão com 31 tarefas → `plan_limits` · pura
- [x] V-02a: Sessão 3 com `after` = Sessão 1, e a Sessão 1 com a 01 `pending` → Sessão 3 `blocked`, `waitingSessions: [id da Sessão 1]` · `itemReadiness` pura
- [x] V-02b: mesma situação com a 01 `completed` → Sessão 3 `ready`, `waitingSessions: []` · pura
- [x] V-02c: Sessão 1 vazia e não iniciada → estado `empty`; a Sessão 2 com `after` = Sessão 1 fica `blocked` (vazia não conta como Concluída) · pura
- [x] V-02d: Sessão 1 com sessão `ended` e a 01 `in_progress`; Sessão 2 com `after` = Sessão 1 → Sessão 1 `ended`, Sessão 2 `blocked` · pura
- [x] V-02e: manifesto novo sem a 03; a Sessão 2 não iniciada só tinha a 03 → `reconcilePlan` mantém a Sessão 2 com `taskIds: []` e a 03 sai de `unassigned` · pura
- [x] V-02f: plano com Sessão 1 (01) e Sessão 2 (02, depende da 01, `after` = Sessão 1) → `buildPlanView` dá à Sessão 2 `after: [id1]`, `waitingSessions: [id1]`, `blockedBy: [{ taskId: "01", status: "pending" }]` · `buildPlanView` pura

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `validatePlan` aceita sessões vazias e recusa `after` para frente com a mensagem exata da REQ-011.
- Uma sessão vazia nunca aparece como `done`.
- `pnpm --dir packages/api typecheck` e `pnpm --dir packages/api lint` sem erros; nenhum arquivo acima de 100 linhas.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- 2026-11-26 · ambiente · o worktree estava sem `node_modules`; rodado `pnpm install --frozen-lockfile --prefer-offline` na raiz.
- 2026-11-26 · 01.1 · `planAfterRules.ts` (ordem de `after`, `after` de sessão iniciada), limites 0–30, `plan_after_order` no catálogo e em `TaskErrorReason`, `after` com `default([])` no schema, DAO com `after: []` · `vitest run planRules.test.ts planAfterRules.test.ts` → passou; `pnpm --dir packages/api typecheck` → sem erros · desvio: o caso antigo V-35d "recusa sessão vazia" foi retirado (a REQ-008 muda essa regra); os V-01 testam pela API pública `validatePlan` em `planAfterRules.test.ts`.
- 2026-11-26 · 01.2 · `planSessionWaits.ts` (`remainingTasks`, `isConcluded`, `waitingSessionsOf`), estado `empty`, `itemReadiness(item, { set, items })`, reconciliação sem descartar vazias, `purposePlanItem` passa os itens · `vitest run planReadiness.test.ts planReconciliation.test.ts` → passou · desvio: o V-35k antigo ("remove a sessão vazia") passou a esperar a sessão mantida, junto com o V-02e.
- 2026-11-26 · 01.3 · `PlanItemView` com `after` e `waitingSessions` · `vitest run src/application/services/tasks-set/` → 9 arquivos, 66 testes passaram; typecheck sem erros · `packages/api` não tem script `lint` (só `apps/web`).

