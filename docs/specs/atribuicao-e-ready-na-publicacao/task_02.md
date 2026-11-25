---
status: completed
title: Migration 0054, gravação e leitura do resultado
type: backend
complexity: high
---

# Task 02: Migration 0054, gravação e leitura do resultado

## Visão geral
Cria as duas colunas em `task_publication_attempts`, grava a escolha no aceite, lê a escolha na reivindicação do worker, grava o resultado uma só vez e expõe `publication.readyAssignment` em `tasks.byId`, com os estados pendente e sem confirmação calculados na leitura (DEC-04). É a fatia de dados: arriscada pela migration e pela compatibilidade do hash do pedido.

<critical>
- LEIA a spec (`spec.md`, principalmente §14, §15, §20 e DEC-04) e as regras do projeto (AGENTS.md, `.claude/rules/code-standards.md`) antes de começar. Use as skills `layered-backend` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- §14: migration **0054** com `_rollback.sql`, acrescentando `assign_to_self boolean NOT NULL DEFAULT false` e `ready_assignment text NULL` com `CHECK (ready_assignment IN ('ready','not_assigned','ready_failed'))` e `CHECK (ready_assignment IS NULL OR assign_to_self)`. As linhas existentes ficam `false`/`null`. O rollback remove as duas colunas.
- §20: aplicar a migration no banco de desenvolvimento logo, porque o `next dev` quebra quando falta coluna.
- REQ-012, REQ-013, REQ-014, RN-06 (leitura): `publication.readyAssignment` é `null` sem a opção; com a opção, é o estado gravado, ou `pending` até 2 minutos depois de `issue_created_at`, ou `unconfirmed` depois.
- NFR-02 (parte): abrir a tarefa não consulta o GitHub para mostrar o resultado.
- B-01 e §15 "Hash do pedido": o hash de `approvalPayload` só inclui a escolha quando ela é verdadeira, para os pedidos antigos manterem o hash.
- REQ-015 e DEC-04: o resultado só é gravado se ainda estiver nulo; depois disso não muda.

## Interfaces
- **Consome:** `taskPublicationAttempts` (`packages/api/src/infra/database/schema/tasks/boundaries.ts:29`); `PublicationApproval`/`PublicationAccepted` (`application/database/dao/taskPublicationDao.ts`); `PublicationWorkerClaim`/`TaskPublicationWorkerDao` (`application/database/dao/taskPublicationWorkerDao.ts`); `TaskPublication` (`application/services/tasks/taskContracts.ts:14`); `readWorkspace` (`controllers/taskWorkspaceReader.ts`, já recebe `now`) e `workspaceDto` (`controllers/mappers/taskWorkspaceDtoMapper.ts`).
- **Produz** (a task_03 e a task_04 consomem estes nomes exatamente):
  ```ts
  // application/services/tasks/taskContracts.ts
  export type ReadyAssignmentResult = "ready" | "not_assigned" | "ready_failed";
  export type ReadyAssignmentState = "pending" | ReadyAssignmentResult | "unconfirmed";
  export type TaskPublication = { /* atual */ assignToSelf: boolean; readyAssignment: ReadyAssignmentResult | null };
  // application/database/dao/taskPublicationDao.ts
  export type PublicationApproval = { /* atual */ assignToSelf: boolean };
  // application/database/dao/taskPublicationWorkerDao.ts
  export type PublicationWorkerClaim = { /* atual */ assignToSelf: boolean };
  export interface TaskPublicationWorkerDao { /* atual */ recordReadyAssignment(claim: PublicationWorkerClaim, result: ReadyAssignmentResult): Promise<boolean> }
  // application/services/tasks/readyAssignmentView.ts
  export const READY_ASSIGNMENT_WINDOW_MS = 120_000;
  export function readyAssignmentView(publication: Pick<TaskPublication, "assignToSelf" | "readyAssignment" | "createdAt">, now: Date): null | { state: ReadyAssignmentState };
  // tasks.byId → publication.readyAssignment: null | { state: "pending" | "ready" | "not_assigned" | "ready_failed" | "unconfirmed" }
  ```

## Mini-tarefas

- [x] **02.1 — Migration 0054, schema e banco de desenvolvimento**
  - **Arquivos:** `packages/api/drizzle/0054_ready_assignment.sql` (criar), `packages/api/drizzle/0054_ready_assignment_rollback.sql` (criar), `packages/api/drizzle/meta/_journal.json`, `packages/api/test/databaseMigrations.ts` (acrescentar em `FEATURE_MIGRATIONS`), `packages/api/src/infra/database/schema/tasks/boundaries.ts` (colunas `assignToSelf` e `readyAssignment` e os dois `check`), `packages/api/test/ready-assignment-migration.test.ts` (criar)
  - **Testes:** V-07e, V-07f, V-07g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/ready-assignment-migration.test.ts` passa, sem `TEST_DATABASE_URL`; `pnpm --dir packages/api typecheck` sem erros; a 0054 aplicada no banco de desenvolvimento com `DATABASE_URL=<valor de apps/web/.env.local> pnpm --dir packages/api db:migrate` e a contagem de `drizzle.__drizzle_migrations` igual à do journal, anotada no Registro
  - **Nota:** antes de criar, confira o journal e `ls packages/api/drizzle`: se a 0052 e a 0053 ainda não existirem, pare e registre a decisão (manter 0054 com buraco ou renumerar) antes de seguir. Espelhe `test/session-plans-migration.test.ts` (`applyMigration`, rollback, reaplicação e captura de `constraint_name`).
- [x] **02.2 — Leitura do resultado em `tasks.byId`**
  - **Arquivos:** `packages/api/src/application/services/tasks/taskContracts.ts`, `packages/api/src/application/services/tasks/readyAssignmentView.ts` (criar), `packages/api/src/application/services/tasks/readyAssignmentView.test.ts` (criar), `packages/api/src/infra/database/dao/tasks/drizzleTaskReadDao.ts` (o método `publication` devolve `assignToSelf` e `readyAssignment`; ele tem 90 linhas: extraia o mapeamento da linha para `taskDaoMapping.ts` ou um arquivo novo `publicationMapping.ts`), `packages/api/src/controllers/taskWorkspaceReader.ts` e `packages/api/src/controllers/mappers/taskWorkspaceDtoMapper.ts` (passar `now` e montar `readyAssignment`), `packages/api/test/ready-assignment-read.test.ts` (criar)
  - **Testes:** V-07a, V-07b, V-07c, V-07d
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks/readyAssignmentView.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/ready-assignment-read.test.ts` passam; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** o DTO de `publication` não expõe `assignToSelf` cru, só `readyAssignment` (§15). O relógio vem do `now` que `readWorkspace` já recebe; nos testes, fixe `now` e `issue_created_at`.
- [x] **02.3 — Gravar a escolha no aceite, lê-la no worker e gravar o resultado uma vez**
  - **Arquivos:** `packages/api/src/application/database/dao/taskPublicationDao.ts`, `packages/api/src/application/database/dao/taskPublicationWorkerDao.ts`, `packages/api/src/infra/database/dao/tasks/taskPublicationApproval.ts` (gravar `assignToSelf`; `approvalPayload` acrescenta um marcador só quando `assignToSelf` é `true`; `findAcceptedTaskPublication` recebe `assignToSelf`), `packages/api/src/infra/database/dao/tasks/drizzleTaskPublicationWorkerDao.ts` (`selectClaim` lê `assignToSelf`; `recordReadyAssignment` com `UPDATE ... WHERE id = attemptId AND task_id = taskId AND ready_assignment IS NULL`), o DAO de publicação que implementa `accepted`/`approve` (`drizzleTaskPublicationDao.ts`), `packages/api/test/ready-assignment-persistence.test.ts` (criar)
  - **Testes:** V-07h, V-07i
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/ready-assignment-persistence.test.ts test/task-publication.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** os chamadores de `approve` e `accepted` ainda não enviam a escolha; passe `assignToSelf: false` em `TaskPublicationController.publish` até a task_03, para o typecheck passar sem mudar comportamento. `drizzleTaskPublicationWorkerDao.ts` tem 65 linhas: se passar de 100, mova `recordReadyAssignment` para uma função num arquivo próprio, como `taskPublicationState.ts`.

## Detalhes de implementação
Migrations depois da 0011 são SQL escrito à mão com irmão `_rollback.sql` e sem snapshot; registre no journal e em `test/databaseMigrations.ts` (memória do projeto e `test/session-plans-migration.test.ts`). Os testes de integração usam o Postgres descartável em memória do `globalSetup`; não defina `TEST_DATABASE_URL`. Para semear tentativas, siga `test/task-publication-case.ts` e `test/task-publication.test.ts`.

### Arquivos relevantes
- `packages/api/src/infra/database/schema/tasks/boundaries.ts:29`: `taskPublicationAttempts` e o padrão de `check`.
- `packages/api/src/infra/database/dao/tasks/taskPublicationApproval.ts:55`: `approvalPayload` de hoje (`[taskId, expectedVersion, revisionId, repositoryId, previewHash]`).
- `packages/api/src/infra/database/dao/tasks/drizzleTaskPublicationWorkerDao.ts:33`: `selectClaim`.
- `packages/api/src/infra/database/dao/tasks/drizzleTaskReadDao.ts:66`: `publication`.
- `packages/api/src/controllers/taskWorkspaceReader.ts`: monta o DTO com `now`.

### Arquivos afetados
- Ver "Arquivos" de cada mini-tarefa.

### Decisões relacionadas
- DEC-04 (spec §17): resultado gravado na tentativa; pendente e sem confirmação são calculados na leitura.

## Premissas
- PT-02: com `now - issue_created_at` de 119 999 ms o estado é `pending`; com 120 000 ms, `unconfirmed`.
- PT-03: `recordReadyAssignment` devolve `false`, sem lançar, quando já existe resultado gravado.
- O marcador da escolha no hash é a string `"assign_to_self"` acrescentada ao fim do array quando `assignToSelf` é `true`.

## Testes atribuídos
- [ ] V-07a: tentativa `created` com `assign_to_self = false` → `tasks.byId` devolve `publication.readyAssignment === null` · DAO de leitura + Postgres
- [ ] V-07b: `assign_to_self = true`, `ready_assignment` nulo, `now` = criação + 119 999 ms → `{ state: "pending" }` · `readyAssignmentView` (função pura) e DAO + Postgres para um caso
- [ ] V-07c: o mesmo com `now` = criação + 120 000 ms → `{ state: "unconfirmed" }` · função pura
- [ ] V-07d: `ready_assignment` gravado como `ready`, `not_assigned` e `ready_failed` → o estado lido é o gravado, mesmo depois de 2 minutos · DAO + Postgres
- [ ] V-07e: tentativa inserida antes da 0054 (aplicar rollback, inserir, reaplicar) → lê `assign_to_self = false`, `ready_assignment = null`, e `tasks.byId` mostra `readyAssignment: null` · Postgres com a migration
- [ ] V-07f: depois do rollback as colunas `assign_to_self` e `ready_assignment` não existem em `task_publication_attempts`; a reaplicação as recria · Postgres com a migration
- [ ] V-07g: gravar `ready_assignment = 'other'` viola o CHECK de valores; gravar `ready_assignment = 'ready'` com `assign_to_self = false` viola o CHECK de coerência (nome da constraint conferido) · Postgres com a migration
- [ ] V-07h: o hash do pedido com `assignToSelf: false` é igual ao calculado com o array de hoje (mesmo pedido repetido devolve a tentativa original); com `assignToSelf: true` é diferente; o aceite grava `assign_to_self = true` na tentativa e o worker o recebe em `claim.assignToSelf` · DAOs reais + Postgres
- [ ] V-07i: `recordReadyAssignment(claim, "ready")` grava e devolve `true`; uma segunda chamada com `"ready_failed"` devolve `false` e o valor lido continua `ready` · DAO real + Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Migration 0054 aplicada no banco de desenvolvimento, com a evidência anotada no Registro.
- `tasks.byId` expõe `publication.readyAssignment` sem nenhuma chamada nova ao GitHub.
- Typecheck de `packages/api` sem erros; nenhum arquivo acima de 100 linhas; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data · mini-tarefa · o que foi feito · comandos e resultado · desvios. -->
- 2026-11-25 · 02.1 · Criada a 0054 e rollback, checks no schema e teste de defaults/rollback/constraints. Decisão registrada: manter a 0054 com lacuna 0052–0053, reservadas no plano para outras specs. · `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/ready-assignment-migration.test.ts` → passou; `pnpm --dir packages/api typecheck` → passou; `pnpm --dir packages/api db:migrate` → passou; contagem em `drizzle.__drizzle_migrations` = 53, journal = 53; duas colunas presentes. · Sem desvios.
- 2026-11-25 · 02.2 · A leitura calcula `pending`/`unconfirmed` com o relógio já fornecido e expõe apenas o estado em `publication.readyAssignment`; adicionados testes puros e Postgres. · `pnpm --dir packages/api exec vitest run src/application/services/tasks/readyAssignmentView.test.ts` → passou (5 testes); `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/ready-assignment-read.test.ts` → passou; `pnpm --dir packages/api typecheck` → passou. · Sem desvios.
- 2026-11-25 · 02.3 · A aprovação grava a opção, o hash só acrescenta `assign_to_self` quando verdadeiro, a reivindicação a devolve ao worker e o resultado é condicional ao campo nulo. · `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/ready-assignment-persistence.test.ts test/task-publication.test.ts` → passou (2 arquivos, 3 testes); `pnpm --dir packages/api typecheck` → passou. · Sem desvios.
