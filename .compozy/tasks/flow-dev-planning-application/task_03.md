---
status: completed
title: Run Dev Control planning through the durable worker
type: backend
complexity: high
---

# Run Dev Control planning through the durable worker

## Overview

Connect accepted planning work to the dedicated snapshot-only Dev Control v1 protocol and settle one validated result through the existing durable worker model. This preserves recovery, fencing, bounded capacity, and safe failure behavior while keeping Flow Dev—not the provider—the authority for route selection and approval.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST call only `POST /flow-dev/planning/v1` with server credentials, a bounded snapshot-only request, correlation values, and operation idempotency key.
- MUST validate a strict, correlated provider envelope and treat malformed, stale, expired, or oversized results as safe planning failures.
- MUST use the shared two-slot worker and fair generate/publish/plan scheduling, lease/fence settlement, bounded recovery, and deadline sweep.
- MUST never dispatch GitHub writes, downstream routes, callbacks, browser capabilities, or provider response text to users or logs.
</requirements>

## Subtasks
- [x] 3.1 Define the server-only gateway contract and strict Dev Control v1 envelope validation.
- [x] 3.2 Implement bounded HTTP transport, redirect refusal, timeout, abort, and safe error classification.
- [x] 3.3 Add planning worker DAO claim, heartbeat, input, completion, failure, reclaim, and deadline behavior.
- [x] 3.4 Implement pre-dispatch authorization revalidation and fenced result settlement.
- [x] 3.5 Extend the existing worker pool with fair planning scheduling and no extra loop or broker.
- [x] 3.6 Wire configuration and lazy production composition without exposing secrets to clients.
- [x] 3.7 Emit redacted durable events and test retry, recovery, fairness, and isolation.

## Implementation Details

Follow TechSpec C04–C06 and Integration Points. HTTP runs outside database transactions; planning settlement is separate from generation/publication settlement. The external provider implementation/deployment is not in this repository and is proven only through the gate plan.

### Relevant Files
- `packages/api/src/application/planning/planningGateway.ts` — planning transport contract.
- `packages/api/src/infra/planning/devControlPlanningGateway.ts` — bounded server-side Dev Control implementation.
- `packages/api/src/controllers/taskPublicationWorkerController.ts` — worker orchestration template.
- `packages/api/src/controllers/taskWorkerController.ts` — two-slot pool and fair kind scheduling.
- `packages/api/src/infra/database/dao/tasks/taskOperationClaim.ts` — lock/lease/fence pattern.
- `packages/api/src/infra/issue-author/devControlIssueAuthorGateway.ts` — fetch, abort, redirect, and capped-body precedent only.

### Dependent Files
- `packages/api/src/cli/tasksWorker.ts` — remains the single process loop.
- `packages/api/src/infra/composition.ts` — server-only planning gateway/worker wiring.
- `packages/api/src/infra/database/schema/tasks/operations.ts` — task 01 plan operation constraints consumed here.
- `packages/api/src/controllers/mappers/planningDtoMapper.ts` — task 02 exposes safe terminal outcomes.
- `apps/web/src/features/issues/issue-composer/hooks/taskReads.ts` — task 04 observes worker status through reads.

### Related ADRs
- [ADR-005: Extend published tasks with durable local planning](adrs/adr-005.md) — worker and queue reuse.
- [ADR-006: Define a dedicated snapshot-only Dev Control planning protocol](adrs/adr-006.md) — external protocol and ownership.

## Deliverables

- Planning gateway, planning-worker DAO/controller, shared scheduler integration, composition, and redacted observability.
- Deterministic local fixtures proving provider behavior without claiming staging capability.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

- [x] UT-027, UT-028, UT-029, UT-030, UT-031 — worker success, revocation, heartbeat abort, fairness, and pool capacity.
- [x] UT-032, UT-033, UT-034, UT-035, UT-036, UT-037, UT-038, UT-039 — Dev Control success, correlation, parsing, size, timeout, mapping, and redirect refusal.
- [x] UT-075, UT-076, UT-080 — worker composition, durable recovery, and safe planning logs.
- [x] IT-003, IT-021, IT-023, IT-024, IT-025, IT-026, IT-027, IT-028, IT-029, IT-030, IT-031, IT-032 — accepted work, claims, retries, fences, scheduling, and worker settlement.
- [x] IT-069, IT-070, IT-080, IT-081, IT-087, IT-088, IT-090, IT-091 — cross-item isolation, HTTP contract, expired/obsolete results, config-after-acceptance, redaction, failure propagation, and per-item recovery.

### Deferred Gates

- [ ] IT-022, IT-033 (`feature-gate`) — run the API/worker integration gate after local worker implementation.
- [ ] IT-071, IT-072, IT-073, IT-074, IT-075 (`feature-gate`) — execute against real Dev Control staging.
- [ ] IT-076 (`qa-release`) — validate real provider replay retention.
- [ ] E2E-028 (`qa-release`) — verify each approved route has no downstream or GitHub side effect.

## Success Criteria

- Every task-required test case implemented and passing.
- Worker restarts, retries, fences, and late responses cannot create or replace an authoritative decision incorrectly.
- Provider credentials, snapshots, tokens, and raw remote failures never reach logs or clients.
