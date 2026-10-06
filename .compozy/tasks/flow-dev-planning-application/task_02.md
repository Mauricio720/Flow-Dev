---
status: completed
title: Expose protected planning commands and coherent reads
type: backend
complexity: high
---

# Expose protected planning commands and coherent reads

## Overview

Deliver the local Flow Dev command and query boundary for planning: authorized authors can start, recover, select, and approve an exact saved decision, while authorized readers receive a coherent read-only projection. This slice makes duplicate, stale, cross-scope, and revoked-access requests safe before the worker or browser uses them.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST enforce repository access and task scope before receipt lookup, and author-only mutation under the task lock.
- MUST provide only the specified strict tRPC procedures and reject browser-supplied identity, publication, approval, or execution values.
- MUST atomically persist command state and scoped receipts, detect stale versions, and never silently rebase a route or approval.
- MUST return an atomic planning/publication/task projection and compact list status without exposing provider data, credentials, or logs.
</requirements>

## Subtasks
- [x] 2.1 Define strict planning request schemas and safe planning error mapping.
- [x] 2.2 Implement transaction-scoped start, retry, selection, approval, and submission services.
- [x] 2.3 Implement controller authorization, scoped receipt recovery, and audit-safe command outcomes.
- [x] 2.4 Extend task detail and list reads with coherent planning projections and permissions.
- [x] 2.5 Mount injected nested planning procedures in the existing tasks router and composition.
- [x] 2.6 Preserve existing published authoring and GitHub-write guards across all planning states.
- [x] 2.7 Test access, validation, idempotency, conflicts, receipts, read consistency, and rollback.

## Implementation Details

Follow TechSpec C02/C07/C08, transaction/concurrency rules, API/error contract, and the task 01 persistence contracts. Keep router handlers schema-to-one-controller-call thin; use existing protected tRPC and error formatter patterns.

### Relevant Files
- `packages/api/src/controllers/tasksController.ts` — existing repository-access and author-mutation conventions.
- `packages/api/src/routers/tasks.ts` — existing injected-controller/lazy router composition.
- `packages/api/src/controllers/taskErrorMapper.ts` — safe domain-to-tRPC mapping precedent.
- `packages/api/src/controllers/mappers/taskDtoMapper.ts` — publication DTO and trusted-link composition.
- `packages/api/src/infra/database/dao/tasks/drizzleTaskReadDao.ts` — detail/list projection boundary.
- `packages/api/test/task-api-support.ts` — real database/router fixtures and published Issue seed.

### Dependent Files
- `packages/api/src/infra/composition.ts` — production controller/DAO factories.
- `packages/api/src/controllers/taskPlanningWorkerController.ts` — consumes accepted command/operation state in task 03.
- `apps/web/src/features/issues/issue-composer/contract.ts` — task 04 consumes inferred outputs.
- `apps/web/src/features/issues/issue-composer/hooks/taskReads.ts` — task 04 consumes coherent projections.

### Related ADRs
- [ADR-001: Continue the existing change through planning in Issues](adrs/adr-001.md) — access and continuation.
- [ADR-003: Separate route selection from final human approval](adrs/adr-003.md) — exact saved review and finality.
- [ADR-007: Version route review and render typed artifacts](adrs/adr-007.md) — command versions and reconciliation.

## Deliverables

- Strict planning tRPC router, controllers, services, DAOs, DTO/error mappers, and atomic read extensions.
- Author-only mutations with idempotent receipts, conflict recovery, and read-only authorized visibility.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

- [x] UT-015, UT-016, UT-017, UT-018 — start/submission authorization and admission configuration.
- [x] UT-020, UT-022 — stored receipts and retry ownership.
- [x] UT-021 — covered at integration level by IT-036 (no-op selection returns the current version without a decision mutation); no separate service unit test exists because PlanningService.selectRoute only delegates to the DAO.
- [x] UT-040, UT-041, UT-042 — strict schemas and error mapping.
- [x] UT-043, UT-044, UT-045 — safe planning DTO and awaiting projection.
- [x] UT-073, UT-074, UT-077, UT-078, UT-079, UT-081 — controller receipts, approval equivalence, and command transaction behavior.
- [x] IT-002, IT-004, IT-005, IT-006, IT-007, IT-008, IT-009, IT-010, IT-011, IT-012, IT-013, IT-014, IT-015, IT-016, IT-017, IT-018, IT-019, IT-020 — command lifecycle, receipt, idempotency, conflict, and authorization flows.
- [x] IT-034, IT-035, IT-036, IT-037, IT-038, IT-039, IT-040, IT-041, IT-042, IT-043, IT-044, IT-045, IT-046 — route selection, approval, and decision-scope rules.
- [x] IT-051, IT-052, IT-053, IT-054, IT-055, IT-056, IT-057, IT-058, IT-059, IT-060, IT-061, IT-062, IT-063, IT-064, IT-065, IT-066, IT-067, IT-068 — coherent reads, pagination, protected boundaries, regressions, and observation safety.
- [x] IT-079, IT-083, IT-084, IT-085, IT-086, IT-089, IT-092, IT-093, IT-094 — receipt races, formatter transport, revocation, versions, audit logging, empty history, rollback, and administrative isolation.

## Success Criteria

- Every task-required test case implemented and passing.
- Readers never mutate planning, and an author never approves a changed or unreviewed route.
- Detail/list state is coherent, scoped, and safe across duplicates, conflicts, and lost access.
