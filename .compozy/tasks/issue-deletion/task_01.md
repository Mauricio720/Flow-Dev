---
status: completed
title: Durable operation, fences, and purge
type: backend
complexity: critical
---

# Task 01: Durable operation, fences, and purge

## Overview

Establish the durable database boundary for issue deletion before any destructive provider action is allowed. This slice owns immutable operation identity, transaction-scoped admission fencing, fenced worker settlement, and an explicit purge of every task-owned row while retaining a content-free completion receipt.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. The operation schema and DAO MUST freeze project, task or Issue identity, initiator, request key, stage, remote evidence, retry timing, and lease fence without storing issue content, credentials, provider bodies, or local paths.
- 2. Reserving the same logical target/request key MUST return the same operation; a key or identity collision MUST never bind another target.
- 3. Task admission and worker settlement MUST honor the deletion fence under the relevant task transaction and lease version; a stale worker MUST NOT write after a newer fence.
- 4. Ready claim and deletion reservation MUST share the existing transaction-scoped Issue identity lock, with a unique operation key for the frozen Issue.
- 5. Local cleanup MUST check terminal work, publication outcome, and required remote evidence in one transaction, remove every issue-owned dependent row, preserve unrelated rows and code artifacts, and mark a minimal receipt completed atomically.
- 6. The migration MUST add terminal cancellation support for task operations and remain compatible with the existing worker claim filters.
</requirements>

## Subtasks

- [x] 01.1 Inventory all task-owned tables, direct and indirect references, and task self-references before defining the purge boundary.
- [x] 01.2 Add the operation schema, constraints, migration, and application DAO contract.
- [x] 01.3 Implement transactional reservation, identity locking, idempotency, lease acquisition, and stale-lease rejection.
- [x] 01.4 Fence generation, publication, planning, spec, claim, execution, and late settlement at their real database write boundaries.
- [x] 01.5 Add cancellation state support to task operations and update claims/settlements accordingly.
- [x] 01.6 Implement explicit transactional cleanup and minimal completed receipts without artifact removal.
- [x] 01.7 Implement the assigned unit and PostgreSQL integration cases and run affected package checks.

## Implementation Details

Follow `_techspec.md` “Data Models” and “State transitions and cleanup.” Keep contracts in `packages/api/src/application/database/dao/`, Drizzle implementation in `packages/api/src/infra/database/dao/`, and schema/migration in `packages/api/src/infra/database/` and `packages/api/drizzle/`. The cleanup order must be derived from the actual FK graph and proven with a populated integration fixture; do not rely on broad cascades.

PRD/story coverage: US-001 permanent local removal, US-004 admission/settlement safety, US-005 durable recovery, and US-007 artifact preservation.

### Relevant Files

- `packages/api/src/infra/database/schema.ts` and `schema/tasks/records.ts` — schema exports, task row and self-references.
- `packages/api/src/infra/database/schema/tasks/operations.ts` — task-operation state and worker evidence.
- `packages/api/src/infra/database/schema/tasks/sources.ts` — source, snapshot, claim, and claim-attempt relations.
- `packages/api/src/infra/database/schema/tasks/{boundaries,planning,spec,specCommands,specRuntime,specPackages,taskExecutionPlans,taskExecution,taskExecutionRuns,taskUnifiedPackages}.ts` — dependent history inventory.
- `packages/api/src/infra/database/schema/{localCommands,localExecutionEvidence}.ts` — local command/evidence rows that must not survive issue cleanup.
- `packages/api/src/infra/database/dao/assigned-issues/identityLock.ts` and `claimReservation.ts` — existing advisory identity lock and claim transaction.
- `packages/api/src/infra/database/dao/tasks/taskCommandHelpers.ts` — task row lock and shared admission guard.
- `packages/api/test/database.ts` — disposable PostgreSQL integration harness.

### Dependent Files

- `packages/api/drizzle/` — generated migration and journal for the operation table, indexes, and cancellation state.
- `packages/api/src/infra/database/dao/tasks/{taskOperationClaim,planningWorkerClaim,drizzleTaskPublicationWorkerDao,taskFlowRunLease}.ts` — current task admissions and leases.
- `packages/api/src/infra/database/dao/spec/{specWorkerClaim,specWorkerSettlement}.ts` — spec admissions and late results.
- `packages/api/src/infra/database/dao/assigned-issues/{sourceBinding,claimReservation}.ts` — claim/deletion serialization.
- `packages/api/src/infra/database/dao/` — new deletion DAO and small purge helpers, split to respect the 100-line TS file limit.
- `packages/api/test/` — focused real-database cleanup and fence coverage.

### Related ADRs

- [ADR-002: Stop active issue work during deletion](adrs/adr-002.md) — the fence precedes confirmed stop.
- [ADR-004: Preserve code artifacts associated with a deleted issue](adrs/adr-004.md) — purge excludes worktrees, branches, and PRs.
- [ADR-005: Persist one deletion operation per immutable issue identity](adrs/adr-005.md) — operation identity and receipt rules.
- [ADR-006: Prove GitHub absence before local issue cleanup](adrs/adr-006.md) — cleanup guard on remote evidence.

## Deliverables

- Operation schema, migration, DAO contract and implementation, admission/settlement fences, and explicit transactional purge.
- Real database fixture covering every task-owned dependency and preservation of unrelated records.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-004 — same target and request key reuse one operation ID.
- [x] UT-024 — cleanup inventory covers every task-owned dependent table.
- [x] UT-027 — queue claim and deletion reservation serialize on one identity.
- [x] UT-028 — stale lease fence cannot settle an operation.
- [x] UT-029 — unknown remote presence cannot enter cleanup or completion.
- [x] UT-030 — a publication attempt without confirmed noncreation is never local-only.
- [x] IT-003 — full populated issue history is purged while unrelated project rows remain.

### Deferred Gates

- [ ] IT-005 (`feature-gate`) — edit/start race, via the API integration command in `_tasks.md` after task 03.

## Success Criteria

- Every task-required test case implemented and passing.
- A fenced issue admits no new work and a stale worker cannot recreate issue-owned content.
- Cleanup and receipt completion are atomic, complete, and leave code artifacts untouched.
