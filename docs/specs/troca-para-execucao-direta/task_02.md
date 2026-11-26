---
status: completed
title: Migration 0055 e RouteSwitchDao
type: backend
complexity: high
---

# Task 02: Migration 0055 e RouteSwitchDao

## Visão geral
Cria a tabela `task_route_switches` e o DAO que grava e lê as propostas. É aqui que moram os riscos de banco: os índices parciais que garantem uma pendente por sessão e uma confirmada por decisão, a corrida entre duas decisões e a transação que grava a decisão junto com a mensagem à sessão.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- §14 e §20: tabela `task_route_switches`, com as colunas, checks e FKs da spec §14; índices únicos parciais `(session_id) where status='pending'` e `(planning_decision_id) where status='confirmed'`; índice `(task_id, proposed_at)`. Migration `0055_route_switches.sql` e `0055_route_switches_rollback.sql`, registradas no `_journal.json` e em `test/databaseMigrations.ts`.
- REQ-010: uma proposta repetida com uma pendente na mesma sessão não cria outra linha.
- REQ-012 e B-02: a decisão só vale com `where status = 'pending'`. Com 0 linhas afetadas e a mesma `decision_request_key`, é replay e devolve o estado atual. Com chave diferente, é `already_decided`.
- NFR-01 e DEC-04: o update da proposta e a mensagem `user` com `requestKey` (em `task_terminal_messages`) ficam na mesma transação.

## Interfaces
- **Consome:** `RouteSwitchStatus`, `RouteSwitchFromRoute`, `RouteSwitchDecision`, `RouteSwitchView` e `routeSwitchState`, de `application/terminal/routeSwitch.ts` e `application/services/tasks/routeSwitchRules.ts` (task 01); `Database` (`infra/database/client`); a inserção de mensagem com `requestKey` de `DrizzleSessionMessageDao` (`infra/database/dao/terminal/drizzleSessionMessageDao.ts`).
- **Produz:**
  - schema `taskRouteSwitches` em `packages/api/src/infra/database/schema/tasks/routeSwitches.ts`, exportado pelo índice do schema;
  - contrato `packages/api/src/application/database/dao/routeSwitchDao.ts`:
    - `RouteSwitchRecord = { id; taskId; planningDecisionId; sessionId; fromRoute: RouteSwitchFromRoute; toRoute: "direct_execution"; summary; reasons: string[]; status: RouteSwitchStatus; decidedByUserId: string | null; decidedByName: string | null; decidedAt: Date | null; decisionRequestKey: string | null; proposedAt: Date }`
    - `ProposalContext = { session: { id; taskId; projectId; purpose; route; status }; currentDecisionId: string | null; hasConfirmedSwitch: boolean; hasCapturedSpec: boolean; hasPendingProposal: boolean; lastDeclinedAt: Date | null; lastAnsweredAt: Date | null }`
    - `DecideInput = { proposalId; sessionId; decision: RouteSwitchDecision; actorId; requestKey; decidedAt: Date; message: string }`
    - `DecideOutcome = { outcome: "decided" | "replayed" | "already_decided" | "not_found"; record: RouteSwitchRecord | null }`
    - `interface RouteSwitchDao { readProposalContext(sessionId: string): Promise<ProposalContext | null>; insertPending(input: InsertPendingInput): Promise<{ created: boolean; record: RouteSwitchRecord }>; decide(input: DecideInput): Promise<DecideOutcome>; findById(id: string): Promise<RouteSwitchRecord | null>; listByTask(taskId: string): Promise<RouteSwitchRecord[]>; findConfirmedForDecision(planningDecisionId: string): Promise<RouteSwitchRecord | null> }`
  - `toRouteSwitchView(record: RouteSwitchRecord, sessionStatus: TerminalSessionStatus): RouteSwitchView` em `packages/api/src/application/services/terminal/routeSwitchView.ts`, que usa `routeSwitchState` da task 01 e serve às tasks 04 e 05;
  - implementação `DrizzleRouteSwitchDao` em `packages/api/src/infra/database/dao/terminal/drizzleRouteSwitchDao.ts`.

## Mini-tarefas

- [x] **02.1 — Schema Drizzle e migration 0055 com rollback**
  - **Arquivos:** `packages/api/src/infra/database/schema/tasks/routeSwitches.ts` (criar), índice do schema que exporta as tabelas de `tasks/` (alterar), `packages/api/drizzle/0055_route_switches.sql` (criar), `packages/api/drizzle/0055_route_switches_rollback.sql` (criar), `packages/api/drizzle/meta/_journal.json` (alterar), `packages/api/test/databaseMigrations.ts` (alterar), `packages/api/test/route-switch-migration.test.ts` (criar)
  - **Testes:** V-10c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-migration.test.ts` passa
  - **Nota:** espelhe `0053_review_cycles.sql` e `test/session-plans-migration.test.ts`. Antes de criar, confira se ainda não existe outra 0055.
- [x] **02.2 — Contrato, inserção da pendente e leituras**
  - **Arquivos:** `packages/api/src/application/database/dao/routeSwitchDao.ts` (criar), `packages/api/src/infra/database/dao/terminal/drizzleRouteSwitchDao.ts` (criar), `packages/api/src/infra/database/dao/terminal/routeSwitchReads.ts` (criar), `packages/api/src/application/services/terminal/routeSwitchView.ts` (criar), `packages/api/src/application/services/terminal/routeSwitchView.test.ts` (criar), `packages/api/test/route-switch-dao.test.ts` (criar)
  - **Testes:** V-03b, V-02l
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-dao.test.ts` e `pnpm --dir packages/api exec vitest run src/application/services/terminal/routeSwitchView.test.ts` passam; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** `insertPending` usa `on conflict do nothing` no índice parcial e devolve a pendente existente com `created: false`. `readProposalContext` junta:
    - a sessão;
    - `tasks.planning_decision_id`;
    - a troca confirmada dessa decisão;
    - `TaskSetReadDao.specs(taskId).length > 0`, ou a mesma consulta de `drizzleTaskSetReadDao.ts`;
    - a pendente;
    - o `decided_at` da última recusa;
    - o `answered_at` da última pergunta (`kind = 'question'`) respondida na sessão.

    `decidedByName` vem de `users.display_name ?? users.name`.
- [x] **02.3 — Decisão transacional com mensagem, replay e corrida**
  - **Arquivos:** `packages/api/src/infra/database/dao/terminal/routeSwitchDecision.ts` (criar), `packages/api/src/infra/database/dao/terminal/drizzleRouteSwitchDao.ts` (alterar), `packages/api/src/infra/database/dao/terminal/drizzleSessionMessageDao.ts` (alterar só para expor a inserção com `requestKey` recebendo a transação), `packages/api/test/route-switch-decision-dao.test.ts` (criar)
  - **Testes:** V-05d, V-06b, V-06c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-decision-dao.test.ts test/session-send.test.ts` passa
  - **Nota:** a mensagem usa a `requestKey` da decisão. `status = decision === "confirm" ? "confirmed" : "declined"`. Se for `not_found`, nada é escrito.

## Detalhes de implementação
- Siga `layered-backend`: o contrato fica em `application/database/dao/` e a implementação em `infra/database/dao/terminal/`. Um arquivo passa de 100 linhas? Divida entre leituras (`routeSwitchReads.ts`) e decisão (`routeSwitchDecision.ts`).
- Para o harness de integração e o seed de sessão, use o padrão de `test/session-interaction-support.ts` e `test/review-system-message.test.ts`, que testa uma mensagem `user` com `requestKey`.

### Arquivos relevantes
- `packages/api/src/infra/database/schema/tasks/terminal.ts`: `taskTerminalSessions` (FK com cascade).
- `packages/api/src/infra/database/schema/tasks/sessionInteraction.ts`: mensagens e pedidos (perguntas e `answered_at`).
- `packages/api/src/infra/database/schema/tasks/planning.ts`: `taskPlanningDecisions`.
- `packages/api/src/infra/database/dao/artifacts/drizzleTaskSetReadDao.ts`: como as specs capturadas são lidas.
- `packages/api/drizzle/0053_review_cycles.sql` e `_rollback.sql`: o modelo de migration.

### Arquivos afetados
- Os arquivos listados nas mini-tarefas.

### Decisões relacionadas
- DEC-02: tabela própria; a decisão de planejamento não muda. DEC-04: mensagem na mesma transação.

## Premissas
- P-01: o DAO calcula `hasCapturedSpec`, e a regra que o usa fica na task 01.

## Testes atribuídos
- [ ] V-10c: banco migrado até a 0055 → a tabela existe e rejeita `to_route='prd'`, `status='x'` e `reasons` com 9 itens. Duas pendentes na mesma sessão violam o índice parcial; duas confirmadas para a mesma decisão também. O rollback derruba a tabela · Postgres de teste
- [ ] V-03b: `insertPending` duas vezes na mesma sessão → a primeira devolve `created: true`, a segunda `created: false` com o mesmo `id`; `count(*) = 1` · DAO + Postgres
- [ ] V-02l: `toRouteSwitchView` com um registro `pending` e a sessão `ended` → `state: "expired"`, `decidedBy: null`, datas em ISO; com um registro `confirmed` decidido por Ana → `state: "confirmed"`, `decidedBy: "Ana"` · função pura
- [ ] V-05d: `decide` com uma falha forçada na inserção da mensagem (requestKey duplicada de outra mensagem, ou dublê da inserção que lança) → a proposta continua `pending` e não sobra mensagem nova (NFR-01) · DAO + Postgres
- [ ] V-06b: duas chamadas de `decide` em paralelo (`Promise.all`), `confirm` e `decline` com chaves diferentes → uma devolve `decided`, a outra `already_decided`; existe uma única mensagem nova e o status final bate com a vencedora · DAO + Postgres
- [ ] V-06c: `decide` repetido com a mesma `requestKey` → a segunda devolve `replayed` com o mesmo `record` (mesmo `decidedAt`); uma única mensagem · DAO + Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test:integration` passa no fim da tarefa (sem `TEST_DATABASE_URL`); `pnpm --dir packages/api typecheck` sem erros.
- A migration 0055 aparece no `_journal.json` e em `databaseMigrations.ts`.

## Registro de execução
- 02.1 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-migration.test.ts` → passou (V-10c: checks, índices parciais e rollback/reaplicação). 0055 estava livre antes da criação.
- 02.2 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-dao.test.ts` → passou (2 testes); `pnpm --dir packages/api exec vitest run src/application/services/terminal/routeSwitchView.test.ts` → passou (2 testes); `pnpm --dir packages/api typecheck` → passou.
- 02.3 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-decision-dao.test.ts test/session-send.test.ts` → passou (2 arquivos, 11 testes).
- Typecheck de fechamento — `pnpm --dir packages/api typecheck` → passou.
- Integração completa — primeira execução: 183 arquivos/856 testes passaram e `session-latency.test.ts` falhou no limite de p95 sob carga; execução isolada desse arquivo passou; segunda execução completa: `pnpm --dir packages/api test:integration` → passou (184 arquivos, 857 testes; 2 arquivos e 5 testes ignorados).
