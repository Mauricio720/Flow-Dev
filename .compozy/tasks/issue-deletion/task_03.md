---
status: completed
title: Local deletion and work interruption
type: backend
complexity: critical
---

# Task 03: Local deletion and work interruption

## Overview

Deliver a complete, protected deletion journey for saved Flow Dev issues with no GitHub publication attempt or confirmed noncreation. The service and worker must fence new work, stop the current work, reconcile in-flight activity, purge local history only when safe, and expose persisted status and retry without claiming success for a linked or uncertain Issue.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. Protected `issueDeletion.preview`, `start`, `status`, and `retry` procedures MUST validate scoped IDs and UUID request keys, derive identity from the session, call one controller method each, and return safe explicit DTOs.
- 2. Current project access and local task author-or-Flow-Dev-admin authority MUST be checked for preview and rechecked before start, status, and retry; existing authoring rules requiring both conditions MUST NOT substitute for deletion policy.
- 3. Start MUST compare a fresh identity/destination fingerprint before reserving a fence; a newly published or otherwise changed target MUST fail with `PRECONDITION_FAILED` without stopping work.
- 4. The deletion worker MUST stop only the current generation, planning, spec, and execution work, reconcile already-terminal or concurrently settled runs, and preserve worktrees, branches, and PRs.
- 5. A stop request or expired lease MUST NOT be treated as terminal evidence; unknown stop and uncertain publication MUST leave a recoverable operation and an intact local task.
- 6. Only never-attempted or confirmed-not-created publication MUST enter local-only cleanup; every other publication state MUST stay recoverable until task 04 adds the remote journey.
- 7. Retrying an operation MUST reuse its frozen target and stopped work state, with no automatic generation, planning, or execution restart.
- 8. The deletion worker MUST run from an actual API worker lifecycle, persist stages across process interruption, and avoid credentials, issue content, private paths, or raw provider text in status and logs.
</requirements>

## Subtasks

- [x] 03.1 Define the deletion target, preview, status, error, and controller contracts for saved tasks.
- [x] 03.2 Implement fresh project access and author-or-admin authorization, safe DTO mapping, and stale-preview rejection.
- [x] 03.3 Add the four protected tRPC procedures and compose the service/DAO dependencies without business logic in the router.
- [x] 03.4 Coordinate exact-current-run stopping across generation, planning, spec, and local execution without removing worktrees.
- [x] 03.5 Reconcile terminal runs and publication attempts before allowing local-only cleanup.
- [x] 03.6 Run a durable deletion worker with lease fencing and truthful recoverable status across restart or connector disconnection.
- [x] 03.7 Hide completed task content from saved history and direct task reads while retaining pending/recoverable status.
- [x] 03.8 Implement all assigned unit and integration cases, then run affected API verification.

## Implementation Details

Follow `_techspec.md` “Core Interfaces,” “State transitions and cleanup,” and “API Endpoints.” Build the local-only path on task 01's operation DAO and purge contract; defer actual GitHub mutation and Ready queue handling to task 04. A linked task or uncertain publication may be previewed/statused but cannot be locally purged here. The stop coordinator needs a deletion-scoped internal path: the existing public run cancellation checks operator work scope, which an eligible author/admin may not have.

PRD/story coverage: US-001 local deletion, US-004 active-work interruption, US-005 stopped-work retry, US-006 current authority, and US-007 artifact preservation.

### Relevant Files

- `packages/api/src/routers/index.ts`, `routers/tasks.ts`, and `schemas/` — root router and established protected procedure conventions.
- `packages/api/src/controllers/{tasksController,taskPublicationController,taskFlowController}.ts` — current authorization/error mapping and work control boundaries.
- `packages/api/src/application/services/access/projectAccessService.ts` and `packages/api/src/application/services/projects/repositoryAccessService.ts` — current project and repository access checks.
- `packages/api/src/application/services/task-flow/taskFlowRunControl.ts` — exact-run stop and reconciliation protocol.
- `packages/api/src/infra/database/dao/tasks/{taskOperationClaim,taskOperationSettlement,taskPublicationState,planningWorkerClaim,planningWorkerSettlement,taskFlowRunLease}.ts` — active work and late settlement.
- `packages/api/src/infra/database/dao/spec/{specCancel,specWorkerClaim,specWorkerSettlement}.ts` — spec cancellation and acknowledgement.
- `packages/api/src/cli/{tasksWorker,taskFlowWorker,specWorker}.ts` and `packages/api/package.json` — worker process startup paths.
- `packages/api/test/database.ts` — PostgreSQL integration harness.

### Dependent Files

- `packages/api/src/application/services/issue-deletion/` — service, stop coordinator, worker contracts, and focused rules.
- `packages/api/src/application/database/dao/` and `infra/database/dao/` — task 01 operation DAO and stop-state integration.
- `packages/api/src/controllers/issueDeletionController.ts` and `controllers/issueDeletionErrors.ts` — protected facade and safe domain-to-tRPC errors.
- `packages/api/src/schemas/issueDeletion.ts`, `routers/issueDeletion.ts`, and `routers/index.ts` — input contract and four procedures.
- `packages/api/src/infra/issueDeletionComposition.ts` and API worker startup — composition and durable sweep.
- `packages/api/src/infra/database/dao/tasks/drizzleTaskReadDao.ts` — completed task filtering for history and direct read.
- `packages/api/test/` — local deletion, stop, authorization, and transport integration cases.

### Related ADRs

- [ADR-001: Delete linked issues from Flow Dev and GitHub](adrs/adr-001.md) — local-only classification must remain strict.
- [ADR-002: Stop active issue work during deletion](adrs/adr-002.md) — stop confirmation before cleanup.
- [ADR-003: Require local authority and confirmed GitHub deletion](adrs/adr-003.md) — local access and safe denial.
- [ADR-004: Preserve code artifacts associated with a deleted issue](adrs/adr-004.md) — stop without checkout cleanup.
- [ADR-005: Persist one deletion operation per immutable issue identity](adrs/adr-005.md) — durable stage and retry.

## Deliverables

- Protected task deletion API, scoped local-only service, durable worker, exact-run stop/reconciliation, and safe task-list/direct-read behavior.
- Real database and tRPC coverage of authorization, races, cancellation, local cleanup, and artifact preservation.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-001 — eligible saved-task author receives local preview.
- [x] UT-002 — ineligible reader sees no capability and cannot start.
- [x] UT-003 — changed publication fingerprint blocks start before fencing.
- [x] UT-013 — old-run acknowledgement does not stop the current run.
- [x] UT-014 — already-terminal current run requires no second cancellation.
- [x] UT-015 — dispatching or uncertain publication blocks local cleanup.
- [x] UT-025 — status with lost project access returns safe `NOT_FOUND`.
- [x] UT-026 — retry leaves stopped work stopped and schedules no restart.
- [x] IT-001 — malformed or wrong-project target changes nothing.
- [x] IT-002 — first-message-only local task is removed without GitHub calls.
- [x] IT-004 — unauthorized start persists no operation or stop.
- [x] IT-007 — repeated start key produces one completed receipt and cannot retarget.
- [x] IT-008 — stale draft preview after publication fails before local deletion.
- [x] IT-024 — already-ended generation/planning reconciles as stopped.
- [x] IT-025 — only current run is canceled; later cleanup removes run history.
- [x] IT-026 — run operator without deletion authority cannot interrupt via start.
- [x] IT-027 — all issue work admissions reject after the start fence.
- [x] IT-029 — repeated confirmations during stop yield one request and operation.
- [x] IT-031 — concurrent run completion does not admit follow-up work.
- [x] IT-042 — forged actor IDs cannot replace session/provider identity.
- [x] IT-043 — wrong-project preview/start exposes no protected content.
- [x] IT-044 — membership revoked after preview blocks mutation before side effects.
- [x] IT-045 — expired session blocks status/retry and preserves operation.
- [x] IT-046 — newly granted access is recalculated with current authority.
- [x] IT-047 — dirty worktree, branch, and PR remain unchanged after deletion.
- [x] IT-049 — disconnected connector leaves recoverable stop and intact worktree.
- [x] IT-051 — prepublication worktree survives local-only deletion.

### Deferred Gates

- [ ] IT-006 (`feature-gate`) — persisted status across a new session.
- [ ] IT-009 (`feature-gate`) — saved-history pagination/search after purge.
- [ ] IT-028 (`feature-gate`) — worker restart and stale lease result.
- [ ] IT-032 (`feature-gate`) — cancellation isolation across concurrent issues.

Run these with the focused API integration command and trigger defined in `_tasks.md`.

## Success Criteria

- Every task-required test case implemented and passing.
- Local-only deletion succeeds only after confirmed stop and safe publication classification; linked or uncertain work retains its task.
- Protected API status remains truthful across retries and process interruption, and artifacts remain intact.
