---
status: completed
title: "Add Claude, worktrees, and CompozyOS Loops"
type: backend
complexity: critical
---

# Task 06: Add Claude, worktrees, and CompozyOS Loops

## Overview

Extend the foundation and task-flow lifecycle with Claude connection support, native CompozyOS worktrees, and live Loop catalog/run management. These runtime actions remain explicitly selected and started, bind every declared runtime role, and reconcile actual external outcomes without weakening the legacy route or safety boundaries.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST authenticate Claude through supervised `claude auth login --claudeai` and isolated private configuration; a missing safe bridge MUST remain `setup_required` and MUST NOT fall back to an API key.
- MUST use the pinned CompozyOS HTTP/UDS catalog, worktree, Loop, and status contracts; local v0.2 CLI and MCP relay MUST NOT substitute for them.
- MUST permit only ready worktrees for the registered repository, preserve resolved worktree identity, prevent conflicting writable use, and never auto-delete a user-owned worktree.
- MUST validate live Loop definition, version, declared safe inputs, prerequisite package state, and every declared runtime role at admission.
- MUST display and settle actual Loop outcomes, cancellation, retry, and uncertainty through immutable snapshots and authoritative reconciliation; no later action may start implicitly.
</requirements>

## Subtasks

- [x] 6.1 Add isolated Claude connection, status, revalidation, and failure semantics to the credential broker and Software surface.
- [x] 6.2 Extend the pinned capability gateway with worktree and Loop catalog/inspection/status contracts.
- [x] 6.3 Implement repository ownership, readiness, creation, exclusivity, and no-auto-cleanup worktree policy.
- [x] 6.4 Validate Loop definitions, versions, declared inputs, runtime roles, and prerequisites before admission.
- [x] 6.5 Start, monitor, cancel, retry, and reconcile Loop runs from accepted immutable snapshots.
- [x] 6.6 Pass only declared role bindings and task-scoped credentials into worker/container execution.
- [x] 6.7 Add author-facing safe states for Claude, worktrees, Loop definitions, and terminal outcomes.
- [x] 6.8 Exercise provider, catalog, workspace, Loop, reconciliation, and legacy-preservation boundaries.

## Implementation Details

Follow TechSpec “Integration Points”, “Testing Approach”, and development sequencing step 5. Extend the new control gateway and task-flow lifecycle rather than the legacy global provider dispatch. Contract fixtures must cover every documented CompozyOS success and error response before a runtime capability is offered.

### Relevant Files

- `packages/api/src/infra/spec/compozy/compozyRuntimeGateway.ts` — current session gateway and adapter family.
- `packages/api/src/infra/spec/compozy/compozySchemas.ts` and `compozyErrors.ts` — pinned contract validation and error patterns.
- `packages/api/src/application/spec/specRuntimeGateway.ts` — existing runtime boundary to extend additively.
- `packages/api/src/infra/spec/containerPlan.ts` and `podmanLauncher.ts` — legacy container/auth mount plan to keep legacy-only.
- `packages/api/src/infra/spec/workspace/gitWorkspaceGateway.ts` — isolated-checkout foundation.
- `packages/api/src/controllers/specDispatch.ts` and `specWorkerComposition.ts` — legacy-only dispatch and composition boundaries.
- `packages/api/src/infra/database/dao/spec/specRetry.ts`, `specWorkerFence.ts`, and `specAttemptSettlement.ts` — retry, fence, and settlement patterns.
- `packages/api/test/spec-daemon.ts`, `spec-runtime-gateway.test.ts`, `spec-workspace.test.ts`, and `spec-restart.test.ts` — gateway, workspace, and restart test fixtures.

### Dependent Files

- `packages/api/src/infra/spec/compozy/claudeCredentialBroker.ts` — isolated Claude login/status implementation.
- `packages/api/src/infra/spec/compozy/compozyWorktrees.ts` and `compozyLoops.ts` — pinned worktree and Loop adapters.
- `packages/api/src/application/services/task-flow/worktreePolicy.ts` — repository/readiness/exclusivity policy.
- `packages/api/src/application/services/task-flow/loopPlanValidator.ts` — version/input/runtime-role validation.
- `packages/api/src/application/services/task-flow/runtimeErrorMapper.ts` and `workerReconciler.ts` — safe failure and authoritative outcome handling.
- `packages/api/src/controllers/taskFlowController.ts` and task workspace feature components — Claude/worktree/Loop commands and safe view states.
- `packages/api/test/task-flow-loops.test.ts` and pinned OpenAPI fixture coverage — runtime contract and lifecycle tests.

### Related ADRs

- [ADR-004: Use pinned CompozyOS control contracts and catalog](adrs/adr-004.md) — live runtime contract source.
- [ADR-005: Bind provider capabilities and worktree to each action](adrs/adr-005.md) — workspace and runtime snapshot binding.
- [ADR-006: Follow the CompozyOS unified spec and Loop lifecycle](adrs/adr-006.md) — explicit action/Loop lifecycle.

## Deliverables

- Safe Claude subscription connection support, native worktree policy, and pinned Loop lifecycle integration.
- Explicit multi-role Loop execution with safe terminal-state reconciliation and UI projections.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-007 — Claude API billing is rejected when subscription authentication was requested.
- [x] UT-011, UT-012 — foreign and concurrently writable worktrees are not admitted.
- [x] UT-013, UT-014, UT-021 — changed Loop versions, unsafe inputs, and missing declared runtime bindings fail before dispatch.
- [x] UT-019, UT-020 — upstream runtime errors are reduced safely and unknown Loop starts reconcile authoritatively.
- [x] IT-086, IT-087, IT-088, IT-089, IT-090, IT-091 — stale/live catalog, reasoning, entitlement, changed choice, historic provenance, and malformed identifier handling.
- [x] IT-100, IT-101, IT-102, IT-103, IT-105 — catalog/definition changes, unsafe inputs, ordered prerequisites, actual terminal Loop states, and duplicate starts.

### Deferred Gates

- [ ] IT-078, IT-079, IT-080, IT-081, IT-082, IT-083, IT-084 (`feature-gate`) — run Claude connection, isolation, entitlement, concurrency, and access integrations.
- [ ] IT-092, IT-093, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099 (`feature-gate`) — run worktree selection/creation/restart and explicit-flow integrations.
- [ ] IT-108, IT-109, IT-110, IT-111, IT-114, IT-115 (`feature-gate`) — run cancellation, retry, multi-role binding, and invalid-role contract integrations.
- [ ] E2E-002, E2E-004, E2E-005 (`qa-release` or `feature-gate`) — run isolated Claude, post-approval explicit Loop, and durable worktree journeys in disposable environments.

## Success Criteria

- Every task-required test case implemented and passing.
- Claude, worktrees, and Loops are offered only from verified live runtime capability.
- Each Loop run records and uses exactly its declared bindings, worktree, and definition version.
- Cancellation, retry, failure, and unknown outcomes are truthful and never trigger an automatic subsequent action.
