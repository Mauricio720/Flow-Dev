---
status: completed
title: Persistência, lifecycle e fronteira tRPC de Spec
type: backend
complexity: critical
---

# Task 01: Persistência, lifecycle e fronteira tRPC de Spec

## Overview

Criar o contrato durável do workflow Spec sem alterar os estados de publicação ou planejamento existentes. Esta fatia entrega as tabelas, DAO, regras de elegibilidade/transição e a fronteira tRPC autenticada que todos os workers e a interface irão consumir.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. MUST add dedicated `task_spec_*` persistence and an additive migration without changing `tasks.status`, legacy operation kinds, or immutable planning triggers.
- 2. MUST enforce scoped actor, project, repository and author access, optimistic `specVersion`, idempotent request receipts, row locks and one active attempt per workflow.
- 3. MUST expose only typed `taskSpec` queries and explicit commands through `/api/trpc`; browser input MUST NOT select identities, paths, runtime sessions or provider commands.
- 4. MUST derive eligibility from the approved selected route and exact upstream approvals, never from an agent label or a guessed fallback.
</requirements>

## Subtasks
- [x] 1.1 Define Spec application contracts, limits, safe reasons and DTO boundaries.
- [x] 1.2 Add the dedicated schema, constraints, immutable approval protection and migration-harness registration.
- [x] 1.3 Implement scoped DAO reads, command receipts and transaction-safe workflow updates.
- [x] 1.4 Implement lifecycle eligibility and state-transition rules for start and approval prerequisites.
- [x] 1.5 Add the thin controller, error mapping and root `taskSpec` router composition.
- [x] 1.6 Preserve repository authorization and author-only mutation rules on every protected operation.
- [x] 1.7 Prove public contract, migration and concurrency behavior with unit and PostgreSQL integration tests.

## Implementation Details

Follow TechSpec sections “Core Interfaces”, “Data Models”, “Lifecycle and command consistency”, and “API Endpoints”. Reuse the planning composition/receipt conventions, but keep Spec persistence and `specVersion` separate from planning and task publication.

### Relevant Files
- `packages/api/src/routers/taskPlanning.ts` — model for thin authenticated procedures and safe error mapping.
- `packages/api/src/controllers/taskPlanningController.ts` — author checks and service delegation pattern.
- `packages/api/src/application/services/tasks/planningService.ts` — lifecycle service boundary to mirror without coupling states.
- `packages/api/src/infra/database/dao/tasks/planningReceiptHelpers.ts` — request-key receipt and replay precedent.
- `packages/api/src/infra/database/schema/tasks/planning.ts` — existing planning provenance and immutable inputs.
- `packages/api/src/infra/database/schema/tasks/boundaries.ts` — confirmed publication and repository binding source.
- `packages/api/src/infra/composition.ts` — production controller composition point.
- `packages/api/test/database.ts` — explicit disposable PostgreSQL migration list.

### Dependent Files
- `packages/api/src/routers/index.ts` — register the root `taskSpec` router.
- `packages/api/src/application/database/dao/taskSpecDao.ts` — new application DAO contract.
- `packages/api/src/application/services/spec/` — new lifecycle helpers and service implementation.
- `packages/api/src/controllers/taskSpecController.ts` — new transport controller.
- `packages/api/src/infra/database/dao/spec/` — new Drizzle DAO implementation.
- `packages/api/src/infra/database/schema.ts` and `packages/api/drizzle/` — exports and additive migration.

### Related ADRs
- [ADR-001: Follow the approved planning route through Spec and Tasks](adrs/adr-001.md) — selected route controls progression.
- [ADR-008: Persist a separate Spec lifecycle and deliver a cursor-based live projection](adrs/adr-008.md) — dedicated persistence, safe reads and receipts.

## Deliverables

- Durable Spec schema, migration, contracts, DAO, lifecycle service, controller and root tRPC router.
- Typed authorization, receipt replay, lifecycle and safe-error behavior compatible with existing tasks/planning flows.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-001, UT-002, UT-003, UT-004, UT-005, UT-006, UT-007, UT-008, UT-013, UT-014, UT-031, UT-032 — API schemas, controller, DAO, lifecycle and command/receipt contracts.
- [x] IT-001, IT-002, IT-004, IT-005, IT-007, IT-008, IT-009, IT-010, IT-011, IT-012, IT-014, IT-015, IT-016, IT-017, IT-018 — scoped route entry, planning/publication gates, author checks and start idempotency.
- [x] IT-151, IT-156, IT-158, IT-166, IT-167, IT-168, IT-169, IT-170, IT-171, IT-172, IT-173, IT-174 — public query/command success, failure and request-key conflict contracts.
- [x] IT-176, IT-177, IT-178, IT-179, IT-197, IT-198, IT-199, IT-200, IT-233, IT-234 — preconditions, PostgreSQL constraints, restart safety and access revalidation.

## Success Criteria

- Every task-required test case implemented and passing.
- All protected Spec reads and commands are scoped, typed and replay-safe.
- Existing approved planning and publication facts remain unchanged by the additive migration.
