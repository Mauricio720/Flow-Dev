---
status: completed
title: "Plan, admit, and dispatch immutable task actions"
type: backend
complexity: critical
---

# Task 04: Plan, admit, and dispatch immutable task actions

## Overview

Implement the author-owned task-flow boundary from live options through idempotent start and snapshot-based worker dispatch. This slice replaces mutable global provider/model authority only for new unified actions while keeping existing legacy workflows readable and finishable.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST let only the task author save a versioned plan from current connection-specific live capabilities; save MUST NOT start an action.
- MUST revalidate author, task/action eligibility and order, exact approval, connection revision, catalog, model/reasoning, host state, and workspace at admission.
- MUST atomically create one immutable execution snapshot, durable idempotent command, and fenced run under the task lock; at most one write-capable run may be active per task.
- MUST dispatch new actions only from the accepted snapshot and task-scoped credential grant, never from current global `SPEC_PROVIDER`, `SPEC_MODEL`, or mutable labels.
- MUST make blocked, unavailable, recovered, and reader-visible states safe and explicit, with no implicit retry, next action, migration, or package mutation.
</requirements>

## Subtasks

- [x] 4.1 Define task-flow application contracts for options, plans, actions, runs, and safe provenance.
- [x] 4.2 Deliver access-checked `taskFlow` queries and author-only plan/action command boundaries.
- [x] 4.3 Implement CAS and idempotency for proposed action-plan writes.
- [x] 4.4 Implement locked admission for ordering, approvals, current capability, and connection/workspace state.
- [x] 4.5 Persist immutable snapshots, run identities, outbox commands, and active-run fencing atomically.
- [x] 4.6 Dispatch and recover new actions from snapshots and narrow credential grants.
- [x] 4.7 Expose safe task status and provenance to authors and readers without configuration authority.
- [x] 4.8 Cover authorization, stale state, concurrency, restart, disconnection, and history behavior.

## Implementation Details

Follow TechSpec “Core Interfaces”, “API Endpoints”, “Safety Invariants”, and development sequencing step 3. Build on task 02's ready connections and task 03's persistence; reuse locking/fencing semantics from the legacy path without changing legacy rows or its environment configuration.

### Relevant Files

- `packages/api/src/application/services/spec/specLifecycleService.ts` — current start/admission service shape.
- `packages/api/src/controllers/taskSpecController.ts` — reusable `requireRead` and `requireAuthor` access boundary.
- `packages/api/src/routers/taskSpec.ts` — existing tRPC procedure and error pattern.
- `packages/api/src/infra/database/dao/spec/specStart.ts` — transaction, lock, replay, and prerequisite pattern.
- `packages/api/src/infra/database/dao/spec/specStartPersist.ts` — atomic attempt persistence reference.
- `packages/api/src/infra/database/dao/spec/specWorkerClaim.ts` and `specWorkerFence.ts` — worker claim and fencing semantics.
- `packages/api/src/controllers/specDispatch.ts` — legacy global dispatch that must remain legacy-only.
- `packages/api/src/infra/specWorkerComposition.ts` — worker composition integration point.

### Dependent Files

- `packages/api/src/application/services/task-flow/taskFlowService.ts` — options, plan, admission, run, and provenance rules.
- `packages/api/src/controllers/taskFlowController.ts` and `packages/api/src/routers/taskFlow.ts` — thin tRPC boundary for the new flow.
- `packages/api/src/schemas/taskFlow.ts` — Zod contracts for revisions, idempotency keys, actions, and pagination.
- `packages/api/src/infra/database/dao/tasks/drizzleTaskFlowDao.ts` — locked plan/run persistence from task 03's contract.
- `packages/api/src/controllers/taskFlowDispatch.ts` — snapshot-based dispatch for new actions.
- `packages/api/src/infra/specWorkerComposition.ts` — composition of snapshot-aware worker dependencies.
- `packages/api/test/task-flow-admission.test.ts` and colocated service/controller tests — concurrency and safe-state coverage.

### Related ADRs

- [ADR-005: Bind provider capabilities and worktree to each action](adrs/adr-005.md) — versioned proposals and immutable accepted snapshots.
- [ADR-006: Follow the CompozyOS unified spec and Loop lifecycle](adrs/adr-006.md) — explicit ordered actions and legacy coexistence.

## Deliverables

- `taskFlow` planning, admission, dispatch, and provenance APIs for new unified actions.
- Snapshot-only execution dispatch and safe reader/author state projections.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-015, UT-016 — approved unified spec enables but does not start `create_tasks`; repeated start key returns one run ID.
- [x] IT-033, IT-035 — disconnect/start races and disconnected historical choices preserve task content and require fresh readiness.
- [x] IT-044, IT-045, IT-046, IT-047, IT-048, IT-049 — plan-option validity, availability, author permission, CAS, replay, and immutable active selections.
- [x] IT-051, IT-052, IT-053, IT-054, IT-055, IT-056 — action snapshot stability, unavailable proposals, duplicate starts, restart recovery, ordering, and long history.
- [x] IT-058, IT-059, IT-060, IT-061, IT-062, IT-063 — blocked admission, safe diagnostics, content preservation, and recovery.
- [x] IT-065, IT-066, IT-067, IT-068, IT-069, IT-070 — safe provenance visibility, revocation, refresh, hostile content, and pagination.

### Deferred Gates

- [ ] IT-043, IT-050, IT-057, IT-064, IT-085 (`feature-gate`) — exercise task options, explicit start, blocked readiness, reader provenance, and live model/reasoning picker integration.
- [ ] E2E-007 (`qa-release`) — verify a reader sees safe cross-provider provenance but cannot invoke author or administrator controls.

## Success Criteria

- Every task-required test case implemented and passing.
- Plan saves never create runs, and accepted starts create exactly one snapshot-bound run.
- A change to a connection, catalog, or global environment setting cannot silently alter an accepted action.
- Legacy Spec routes, packages, and in-progress attempts remain intact.
