---
status: completed
title: Linked and Ready Issue deletion
type: backend
complexity: critical
---

# Task 04: Linked and Ready Issue deletion

## Overview

Extend the durable deletion journey to published Flow Dev Issues, claimed imported Issues, and unclaimed Ready queue Issues. The service must keep one frozen target through publication reconciliation, GitHub permission checks, remote read-back, local cleanup, and retry after denial, timeout, rate limit, or restart.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. Linked Issue deletion MUST freeze and reverify the project repository database/node IDs and Issue node/number; a transfer, mismatch, missing identity, or changed node MUST never select another Issue.
- 2. Imported author authority MUST use the verified GitHub author database ID and current actor GitHub identity, or Flow Dev administrator authority, with current project access; assignment and run control MUST grant no deletion authority.
- 3. Every linked attempt and retry MUST use the initiating person's current GitHub authorization and permission, and MUST retain the local task after denial, unavailable provider, unknown outcome, or unknown stop.
- 4. A dispatched publication MUST be reconciled; a confirmed created Issue MUST be adopted once and deleted remotely before local cleanup, while uncertain creation MUST remain recoverable.
- 5. A timeout or lost `deleteIssue` response MUST enter absence verification before another mutation; only confirmed 410 evidence with repository read access may mark remote absence.
- 6. Queue-only deletion MUST share the identity lock with claim, attach a task if claim won between preview and start, avoid inventing a task when none exists, and filter completed/pending queue identities despite stale board data.
- 7. Rate-limited operations MUST persist retry timing and avoid immediate retry; repeated keys or concurrent eligible actors MUST converge on the same operation without duplicate provider actions.
- 8. Recovery MUST preserve stopped work and all worktrees, branches, and PRs and expose only safe reason codes and truthful remote presence.
</requirements>

## Subtasks

- [x] 04.1 Extend preview/start/status/retry to linked saved tasks, claimed imported tasks, and unclaimed Ready Issues.
- [x] 04.2 Add imported-author and current GitHub identity authorization independently of claim/operator rights.
- [x] 04.3 Reconcile in-flight publication and adopt only its confirmed exact Issue node.
- [x] 04.4 Connect the GitHub gateway to remote inspection, permission, mutation, and absence verification stages.
- [x] 04.5 Persist recoverable denial, unknown, rate-limited, and authorization-loss states with safe retry timing.
- [x] 04.6 Serialize Ready claim and deletion, attach newly claimed tasks, and filter queue discovery/detail reads by operation state.
- [x] 04.7 Complete local cleanup or queue-only receipt only after confirmed remote absence and stopped work.
- [x] 04.8 Implement the assigned provider-backed and PostgreSQL integration cases and run affected API checks.

## Implementation Details

Follow `_techspec.md` “Authorization and identity,” “State transitions and cleanup,” “API Endpoints,” and “Integration Points.” Build on task 03's controller/service and task 01's identity-bound DAO; use task 02's gateway rather than duplicating provider HTTP logic. The Ready queue's provider projection currently lacks author identity and its discovery path does not consult deletion operations; both are part of this integration. A queue claim between preview and reservation attaches to the same frozen identity, and a completed receipt suppresses cached board rows.

PRD/story coverage: US-002 published Issues, US-003 imported and Ready Issues, US-004 publication reconciliation, US-005 recovery, US-006 dual authorization, and US-007 artifact preservation.

### Relevant Files

- `packages/api/src/application/github/issueDeletionGateway.ts` and `infra/github/githubIssueDeletionGateway.ts` — provider contract and implementation from task 02.
- `packages/api/src/application/github/repositoryAuthorizationService.ts` — initiating person's current token and GitHub identity.
- `packages/api/src/application/services/assigned-issues/{assignedIssueDiscovery,assignedIssueLookup,issueClaimService,assignedIssueRules}.ts` — Ready/claimed Issue behavior.
- `packages/api/src/infra/database/dao/assigned-issues/{identityLock,claimReservation,sourceBinding,drizzleIssueClaimDao}.ts` — claim serialization and imported task creation.
- `packages/api/src/infra/database/dao/tasks/taskPublicationState.ts` — created/rejected/uncertain publication outcome.
- `packages/api/src/infra/assignedIssuesComposition.ts` — current assigned-work composition.
- `packages/api/src/infra/database/dao/tasks/drizzleTaskReadDao.ts` — saved history and linked task read filtering.

### Dependent Files

- `packages/api/src/application/services/issue-deletion/` — linked/queue stages, provider recovery, author policy, and retry rules.
- `packages/api/src/controllers/issueDeletionController.ts`, `schemas/issueDeletion.ts`, and `routers/issueDeletion.ts` — queue target support and safe outward status.
- `packages/api/src/infra/issueDeletionComposition.ts` and API worker entrypoint — gateway wiring, scheduled resume, and retry-at enforcement.
- `packages/api/src/application/services/assigned-issues/{assignedIssueDiscovery,assignedIssueLookup}.ts` — queue visibility/status with stale board responses.
- `packages/api/src/infra/database/dao/assigned-issues/claimReservation.ts` — attach or reject a claim under the frozen identity lock.
- `packages/api/test/` — linked, imported, Ready, provider-failure, and retry integration cases.

### Related ADRs

- [ADR-001: Delete linked issues from Flow Dev and GitHub](adrs/adr-001.md) — published and imported destinations.
- [ADR-002: Stop active issue work during deletion](adrs/adr-002.md) — publication and run reconciliation.
- [ADR-003: Require local authority and confirmed GitHub deletion](adrs/adr-003.md) — dual permission systems.
- [ADR-004: Preserve code artifacts associated with a deleted issue](adrs/adr-004.md) — retries cannot clean code artifacts.
- [ADR-005: Persist one deletion operation per immutable issue identity](adrs/adr-005.md) — idempotent queue and linked recovery.
- [ADR-006: Prove GitHub absence before local issue cleanup](adrs/adr-006.md) — remote read-back rule.

## Deliverables

- Complete protected linked and Ready deletion flow with verified provider identity, queue serialization, remote absence proof, and durable recovery.
- Queue/list filtering and status semantics that remain correct under stale board responses and concurrent claims.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-005 — retry key bound to another operation or target conflicts safely.
- [x] UT-006 — verified imported GitHub author is eligible independent of assignee.
- [x] UT-007 — missing imported author leaves only admin path.
- [x] UT-016 — timed-out mutation verifies absence before any second remove.
- [x] UT-020 — 429 Retry-After persists a future retry time and prevents immediate retry.
- [x] IT-010 — wrong repository or Issue identity never calls remove.
- [x] IT-011 — published task missing node ID remains recoverable.
- [x] IT-012 — GitHub denial retains remote and local Issues.
- [x] IT-014 — lost mutation response plus 410 completes without another remove.
- [x] IT-015 — proven already-absent linked Issue skips mutation and purges local task.
- [x] IT-016 — rename continues on stable IDs; transfer blocks.
- [x] IT-017 — unclaimed Ready Issue completes remotely without local task creation.
- [x] IT-018 — nonauthor/nonadmin assignee cannot delete queue Issue.
- [x] IT-021 — claim after preview binds the newly created task to the same Issue.
- [x] IT-022 — Ready status/assignee change preserves exact-node author/admin access.
- [x] IT-030 — late created publication is adopted and deleted before cleanup.
- [x] IT-033 — cross-target retry cannot mutate either Issue.
- [x] IT-034 — provider rate limit persists retry time and makes no premature call.
- [x] IT-035 — revoked OAuth leaves task and requests fresh authorization.
- [x] IT-038 — repeated retry key causes one resume without restarting work.
- [x] IT-039 — unknown prior removal verifies presence before another authorized mutation.
- [x] IT-040 — proven 410 completes; 404 or inaccessible repository remains recoverable.
- [x] IT-050 — repeated retries make no filesystem, branch, or PR destructive calls.

### Deferred Gates

- [ ] IT-013 (`feature-gate`) — concurrent linked starts.
- [ ] IT-019 (`feature-gate`) — claim/deletion race.
- [ ] IT-020 (`feature-gate`) — stale board or board failure.
- [ ] IT-023 (`feature-gate`) — multi-assignee discovery convergence.
- [ ] IT-036 (`feature-gate`) — concurrent retries.
- [ ] IT-037 (`feature-gate`) — restart between remote delete and local cleanup.
- [ ] IT-041 (`feature-gate`) — many independent pending operations.
- [ ] IT-048 (`feature-gate`) — PR opened during stop remains.
- [ ] IT-052 (`feature-gate`) — independent branch/PR changes remain.
- [ ] IT-053 (`feature-gate`) — artifacts and work of other Issues remain.

Run these with the focused API integration command and trigger defined in `_tasks.md`.

## Success Criteria

- Every task-required test case implemented and passing.
- No local task is purged while GitHub presence or publication creation is uncertain.
- Repeated starts/retries remain bound to one Issue, and Ready discovery cannot revive a completed or pending target.
