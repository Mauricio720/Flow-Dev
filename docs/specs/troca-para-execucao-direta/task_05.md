---
status: pending
title: Rota efetiva nas leituras, timeline e exclusão
type: backend
complexity: medium
---

# Task 05: Rota efetiva nas leituras, timeline e exclusão

## Visão geral
Faz a troca confirmada valer em todos os leitores: no prompt e na coluna `route` da sessão nova, no chip da lista, no `PlanningDetail`, no histórico de sessões e na timeline da conversa. A timeline mostra o cartão e o texto da IA sem o bloco. A exclusão da Issue passa a apagar as propostas, e as suítes existentes confirmam que o resto não mudou.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-017: uma sessão de rota aberta depois da troca usa `ROUTE_INSTRUCTION.direct_execution` e a linha "Rota aprovada: <origem> · trocada para Execução direta". A coluna `route` da sessão nova é `direct_execution` (fluxo 3 da §16).
- REQ-014: `WorkProgress.route` passa a ser a rota efetiva.
- REQ-018 e B-04: a troca vale até o replan; com uma decisão nova, a rota efetiva volta a ser a dela, e `PlanningDetail.routeSwitch` fica `null`.
- REQ-003: a timeline mostra o texto da IA sem o bloco, e ganha o item `{ type: "route_switch", proposal: RouteSwitchView }` na posição de `proposedAt`. O estado é o calculado (RN-03). O item segue o formato `type` das entradas que já existem; a spec escreve `kind`, mas a timeline atual usa `type`.
- Dados para a tela (REQ-015, REQ-016): `PlanningDetail.routeSwitch: RouteSwitchView | null`, só com a confirmada da decisão vigente; o item do histórico ganha `switchedTo: "direct_execution" | null`, preenchido só na sessão em que a troca foi confirmada.
- B-06: a exclusão da Issue apaga as linhas de `task_route_switches` do trabalho, antes de `tasks` (FK `restrict`).
- §9 e B-03: as suítes de planejamento, sessão e exclusão passam sem mudar as expectativas.

## Interfaces
- **Consome:**
  - da task 01: `effectiveRoute`, `parseRouteSwitchBlock`, `ROUTE_SWITCHED_SUFFIX`, `ROUTE_LABEL`;
  - da task 02: `RouteSwitchDao.listByTask`, `findConfirmedForDecision`, `toRouteSwitchView`, `taskRouteSwitches`.
- **Produz:**
  - `ApprovedPlanning` (`application/database/dao/terminalSessionDao.ts`) ganha `switchedFrom: RouteSwitchFromRoute | null`; `route` passa a ser a efetiva;
  - `PromptSource` ganha `switchedFrom: RouteSwitchFromRoute | null`;
  - `PlanningDetail` (DTO de `controllers/mappers/planningDtoMapper.ts`) ganha `routeSwitch: RouteSwitchView | null`;
  - o item de sessão de `TerminalExecutionReader` ganha `switchedTo: "direct_execution" | null`;
  - `TimelineEntry` ganha `{ type: "route_switch"; id: string; proposal: RouteSwitchView; at: string }`;
  - `TimelineRows` ganha `routeSwitches: RouteSwitchRecord[]` e o status da sessão.

## Mini-tarefas

- [ ] **05.1 — Rota efetiva no prompt e na sessão nova**
  - **Arquivos:** `packages/api/src/infra/database/dao/terminal/terminalPromptSource.ts` (alterar), `packages/api/src/application/database/dao/terminalSessionDao.ts` (alterar o tipo `ApprovedPlanning`), `packages/api/src/application/services/terminal/terminalPromptBuilder.ts` (alterar), quem monta o `PromptSource` a partir de `ApprovedPlanning` (procure `buildDefaultPrompt(`), `packages/api/src/application/services/terminal/terminalPromptBuilder.test.ts` (alterar), `packages/api/test/route-switch-effective-prompt.test.ts` (criar)
  - **Testes:** V-07d, V-07e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/terminalPromptBuilder.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-effective-prompt.test.ts` passam
  - **Nota:** confira se o launcher e o preview (`sessionLauncher.ts`, `sessionPurpose.ts`) usam `ApprovedPlanning.route` para mais alguma coisa além do prompt e da coluna `route`, e registre no log o que encontrou.
- [ ] **05.2 — Chip da lista e registro no PlanningDetail**
  - **Arquivos:** `packages/api/src/infra/database/dao/assigned-issues/workProgressReads.ts` (alterar), `packages/api/src/infra/database/dao/tasks/planningProjection.ts` (alterar), `packages/api/src/application/database/dao/taskPlanningDao.ts` (alterar `PlanningProjectionRecord`), `packages/api/src/controllers/mappers/planningDtoMapper.ts` (alterar), `packages/api/test/route-switch-effective-reads.test.ts` (criar)
  - **Testes:** V-07a, V-07b, V-07c, V-07f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-effective-reads.test.ts test/assigned-work-progress.test.ts test/planning-reads.test.ts` passa
  - **Nota:** `readRoutes` usa a decisão mais recente por tarefa. Junte a confirmada **dessa** decisão (left join por `planning_decision_id` e `status='confirmed'`) e aplique `effectiveRoute`.
- [ ] **05.3 — Histórico com switchedTo e timeline com o item da troca**
  - **Arquivos:** `packages/api/src/infra/database/dao/terminal/drizzleTerminalExecutionDao.ts` (alterar), `packages/api/src/application/services/terminal/terminalExecutionReader.ts` (alterar), `packages/api/src/infra/database/dao/terminal/drizzleSessionTimelineDao.ts` (alterar), `packages/api/src/application/database/dao/sessionTimelineDao.ts` (alterar `TimelineRows`), `packages/api/src/application/services/terminal/sessionTimelineMerge.ts` (alterar; se passar de 100 linhas, crie `routeSwitchTimelineEntry.ts`), `packages/api/test/route-switch-timeline.test.ts` (criar)
  - **Testes:** V-07g, V-07h, V-07i, V-07j
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-timeline.test.ts test/session-timeline.test.ts` passa
  - **Nota:** no `messageEntry`, quando `role === "assistant"`, use `parseRouteSwitchBlock(content).text`. O cursor `after` da timeline usa `changedAt`; para o item da troca, `changedAt = decidedAt ?? proposedAt`, para a mudança de estado chegar no mesmo ciclo de leitura (NFR-01).
- [ ] **05.4 — Exclusão apaga as propostas e as suítes existentes seguem verdes**
  - **Arquivos:** `packages/api/src/infra/database/dao/issue-deletion/drizzleIssueDeletionDao.ts` ou `deletionPurge.ts` (alterar; o primeiro já tem 142 linhas, então ponha a nova remoção em `deletionPurge.ts`), `packages/api/test/issue-deletion-terminal.test.ts` (alterar)
  - **Testes:** V-10a, V-10b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/issue-deletion-terminal.test.ts` passa; depois, `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passam inteiros
  - **Nota:** as suítes `planning-*`, `session-*` e `issue-deletion-*` não podem ter expectativa alterada; se alguma mudar, registre o motivo no log.

## Detalhes de implementação
- A rota efetiva é calculada sempre por `effectiveRoute` (task 01); não reimplemente a regra nos leitores.
- A sessão onde a troca aconteceu mantém `route` de origem (DEC-02). O histórico só deriva a seta por `switchedTo`.

### Arquivos relevantes
- `packages/api/src/infra/database/dao/terminal/terminalPromptSource.ts`: `readApprovedPlanning`.
- `packages/api/src/infra/database/dao/assigned-issues/workProgressReads.ts`: `readRoutes`.
- `packages/api/src/infra/database/dao/tasks/planningProjection.ts`: `findDecision`.
- `packages/api/src/application/services/terminal/sessionTimelineMerge.ts`: `mergeTimeline`.
- `packages/api/src/infra/database/dao/terminal/drizzleTerminalExecutionDao.ts`: a lista de sessões do histórico.

### Arquivos afetados
- Os arquivos listados nas mini-tarefas.

### Decisões relacionadas
- DEC-02: a "rota efetiva" é calculada nos leitores; a decisão não é tocada.

## Premissas
- PT-04: a linha fica "Rota aprovada: PRD · trocada para Execução direta · Complexidade: Baixa".

## Testes atribuídos
- [ ] V-07d: `buildDefaultPrompt` com `route: "direct_execution"` e `switchedFrom: "prd"` → começa com `/flow-dev:direct-executor` e contém "Rota aprovada: PRD · trocada para Execução direta". Com troca confirmada no banco, `readApprovedPlanning` devolve `route: "direct_execution"` e `switchedFrom: "prd"`, e uma sessão aberta pelo caminho real grava `route = 'direct_execution'` (US-01 cen. 3) · builder puro + leitura + Postgres
- [ ] V-07e: troca confirmada na decisão D1, depois replan aprovado como D2 (`prd`) → `readApprovedPlanning.route = "prd"`, `switchedFrom: null` (B-04) · Postgres
- [ ] V-07a: tarefa com decisão vigente `prd` e troca confirmada dela → `readProgress(...).route = "direct_execution"` (REQ-014) · Postgres
- [ ] V-07b: tarefa `prd` sem troca → `route = "prd"` · Postgres
- [ ] V-07c: tarefa `prd` só com uma proposta `pending` e outra `declined` → `route = "prd"` · Postgres
- [ ] V-07f: `PlanningDetail` com troca confirmada por Ana às 10:06 → `routeSwitch` com `state: "confirmed"`, `decidedBy: "Ana"`, `decidedAt` ISO das 10:06 e os motivos; `recommendedRoute` e `selectedRoute` continuam `prd`. Depois do replan → `routeSwitch: null` · Postgres
- [ ] V-07g: duas sessões de rota; a troca foi confirmada na segunda → `switchedTo` é `null` na primeira e `"direct_execution"` na segunda; `route` da segunda continua `prd` · Postgres
- [ ] V-07h: mensagem da IA "Explicação." + bloco gravada, e pendente criada → a timeline traz a mensagem com `content = "Explicação."` e um item `route_switch` com `state: "pending"`, ordenado pelo `proposedAt` · Postgres
- [ ] V-07i: a mesma pendente com a sessão `ended` → item com `state: "expired"` (US-01 cen. 4) · Postgres
- [ ] V-07j: leitura com `after` igual ao cursor anterior, depois de a proposta ser confirmada → o item volta com `state: "confirmed"` · Postgres
- [ ] V-10a: as suítes de planejamento, sessão e exclusão já existentes passam sem mudar as expectativas · suítes existentes
- [ ] V-10b: excluir uma Issue que tem propostas pendente, confirmada e recusada → zero linhas em `task_route_switches` para a tarefa, e a exclusão termina sem erro de FK (B-06) · Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test`, `test:integration` e `typecheck` passam no fim da tarefa.

## Registro de execução
