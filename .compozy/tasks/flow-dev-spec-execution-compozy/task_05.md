---
status: completed
title: Ajuste, cancelamento, retry e retorno à revisão
type: backend
complexity: high
---

# Task 05: Ajuste, cancelamento, retry e retorno à revisão

## Overview

Completar os comandos de recuperação que preservam contexto e impedem tentativas concorrentes ou resultados tardios de substituir a verdade atual. Ajustes mantêm a revisão anterior, cancelamentos aguardam confirmação verificável e retries só iniciam após a reconciliação autoritativa.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. MUST create adjustment attempts from an exact unapproved review package and preserve the prior complete version as a separate immutable candidate.
- 2. MUST distinguish cancellation requested, stopping, verified terminal settlement and unknown outcome; a late result MUST NOT resurrect a canceled attempt.
- 3. MUST retry only a scoped eligible failed/canceled attempt after reconciliation, reusing applicable saved context without replaying broad permission grants.
- 4. MUST return to an earlier complete review package only after canonical-file verification and without silently approving it.
</requirements>

## Subtasks
- [x] 5.1 Implement exact-package adjustment admission and input preservation.
- [x] 5.2 Implement worker-owned cancellation dispatch, inspection and terminal arbitration.
- [x] 5.3 Implement retry eligibility, context reconstruction and competing-attempt prevention.
- [x] 5.4 Implement explicit return-to-review verification and package selection.
- [x] 5.5 Extend receipt/reconciliation behavior for lost responses and stale commands.
- [x] 5.6 Revalidate access and artifact integrity before every recovery side effect.
- [x] 5.7 Test races, stale attempts, partial output and recovery under process/runtime failures.

## Implementation Details

Follow TechSpec section “Lifecycle and command consistency” and the recovery rules in the PRD. Consume lifecycle, workspace/runtime, interaction and package contracts from tasks 01–04; add only the recovery commands and worker settlement behavior that remain outside those task boundaries.

### Relevant Files
- `packages/api/src/controllers/taskPlanningWorkerController.ts` — lease, heartbeat and stale worker-settlement precedent.
- `packages/api/src/infra/database/dao/tasks/planningWorkerClaim.ts` — claim/fence persistence pattern.
- `packages/api/src/infra/database/dao/tasks/planningWorkerSettlement.ts` — settled-outcome transaction pattern.
- `packages/api/src/infra/database/dao/tasks/planningReceiptHelpers.ts` — receipt replay and payload-hash conflict behavior.
- `packages/api/src/application/services/tasks/planningTransitions.test.ts` — pure transition testing precedent.
- `packages/api/src/application/services/projects/repositoryAccessService.ts` — authorization revalidation boundary.

### Dependent Files
- `packages/api/src/application/services/spec/specLifecycleService.ts` — adjustment, cancel, retry and return rules.
- `packages/api/src/controllers/specWorkerController.ts` — stop, reconcile and late-result settlement.
- `packages/api/src/controllers/taskSpecController.ts` and `packages/api/src/routers/taskSpec.ts` — recovery command endpoints.
- `packages/api/src/infra/database/dao/spec/` — recovery receipt, attempt and package-pointer transactions.
- `packages/api/src/application/spec/specRuntimeGateway.ts` — verified stop and runtime inspection contract.
- `packages/api/src/application/spec/specWorkspaceGateway.ts` — return-to-review verification/promote contract.

### Related ADRs
- [ADR-003: Review every stage through a Human View and request changes from the agent](adrs/adr-003.md) — reviewed version and explicit progression.
- [ADR-004: Preserve context across interactive runs, cancellation, and retry](adrs/adr-004.md) — durable recovery and author-only control.
- [ADR-009: Capture immutable document packages with recoverable filesystem promotion](adrs/adr-009.md) — verified canonical restore and conflict handling.

## Deliverables

- Adjustment, cancellation, retry and return-to-review commands with truthful asynchronous receipts.
- Fenced worker settlement that preserves saved context and prior complete review packages.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] IT-081, IT-082, IT-083, IT-084, IT-085, IT-086, IT-087, IT-088, IT-089, IT-091, IT-092, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099 — adjustment and exact-approval races, validation and late-result handling.
- [x] IT-101, IT-102, IT-104, IT-105, IT-107, IT-108, IT-109 — cancellation scope, terminal-state, authorization and stop races.
- [x] IT-111, IT-112, IT-115, IT-116, IT-117, IT-118 — retry scope, durable context, concurrency and route gates.
- [x] IT-122, IT-123, IT-124, IT-128, IT-129, IT-159, IT-162, IT-163, IT-164 — retained packages, recovery reads and return-to-review state.
- [x] IT-180, IT-181, IT-182, IT-183, IT-184, IT-185, IT-195, IT-196 — execution blockers, active/unknown outcomes and artifact-conflict recovery.

## Success Criteria

- Every task-required test case implemented and passing.
- No retry, adjustment or cancellation creates competing execution or silently changes an approved/reviewed package.
- Users can recover explicitly from settled failures while unresolved outcomes remain clearly blocked.
