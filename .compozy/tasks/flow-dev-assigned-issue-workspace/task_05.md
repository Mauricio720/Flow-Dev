---
status: completed
title: Local execution, required gates, and safe evidence settlement
type: backend
complexity: critical
---

# Local execution, required gates, and safe evidence settlement

## Overview

Deliver actual user-machine execution on top of the paired companion: explicit preparation and commands, durable journal/recovery/locks, native runtime support, project-defined gates, and truthful safe result settlement. This slice makes a local action usable from assigned work without inventing a generic browser-control product or treating runtime completion as gate success.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST journal and fsync command intent, identity, fence, and payload before local effect; an identical replay MUST not submit a second native action.
- MUST use the canonical linked checkout root, checkout locks, and durable reconciliation; lost heartbeat, lease, or browser MUST NOT create a replacement execution.
- MUST resolve applicable instructions/skills/gates into a pinned manifest and never infer mandatory gates from arbitrary package scripts.
- MUST settle a gated action successfully only when the current required gates, runtime result, artifacts, manifest, and checked checkout digest are valid.
- MUST distinguish Playwright assertion failure from missing browser/config/service and report `none_required` rather than fabricated success.
- MUST sanitize and bound evidence before host egress; raw paths, secrets, traces, screenshots, and terminal output MUST stay local or be rejected.
</requirements>

## Subtasks
- [x] 5.1 Add command, lock, run provenance, gate, and evidence persistence/DAO contracts.
- [x] 5.2 Implement explicit local preparation and target validation from operator/source/link state.
- [x] 5.3 Implement typed command/event handling, journal replay, fencing, locks, cancellation, answers, and reconciliation.
- [x] 5.4 Add native runtime/launcher support for the actual local checkout and preserve dirty files/artifact conflicts.
- [x] 5.5 Resolve project obligations and execute/settle required command and Playwright gates.
- [x] 5.6 Sanitize safe evidence and expose bounded gates/evidence DTOs to assigned-work UI.
- [x] 5.7 Prove local recovery, current-gate enforcement, and egress safety with integration and fixture contracts.

## Implementation Details

Consume task 02’s `WorkAuthorization` and task 04’s protocol/link contracts. Follow the TechSpec sections “Local pairing, linking and preparation”, “Local command delivery and execution”, and “Instructions, gates, Playwright and evidence”; retain eligible hosted execution explicitly.

### Relevant Files
- `packages/api/src/application/services/task-flow/{taskFlowAdmission,taskFlowOptions,runtimeChoiceValidator,taskFlowRunControl}.ts` — admission and action lifecycle integration.
- `packages/api/src/infra/taskFlowWorkerComposition.ts` and `packages/api/src/infra/spec/{runWorkspaceProvider,localProjectAccess}.ts` — host-only wiring and path assumptions.
- `packages/api/src/infra/spec/compozy/snapshotRunExecutor.ts` — hard-coded `/workspace` must not govern native local execution.
- `packages/api/src/infra/spec/{podmanRunLauncher,approvedArtifactInstaller}.ts` — preserve hosted behavior and dirty-file safety.
- `packages/api/src/infra/database/schema/tasks/{taskExecution,taskExecutionRuns}.ts` and `packages/api/src/infra/database/dao/tasks/{taskFlowMappers,taskFlowRunStore,taskFlowRunLease}.ts` — target/provenance round-trip.
- `packages/api/src/{routers/taskFlow.ts,controllers/taskFlowController.ts,schemas/taskFlow.ts}` — preparation, command, gate, and evidence transport.

### Dependent Files
- `packages/api/src/application/services/local-execution/` and `packages/api/src/infra/local-execution/` — new command, journal, gate, evidence, and native-runtime responsibilities.
- `apps/web/src/features/issues/assigned-work/` — task 03 feature receives safe gate/evidence state and controls.
- `apps/web/e2e/task-workspace.spec.ts` and its fixture companion — deferred local browser/gate journeys.

### Related ADRs
- [ADR-002: Link each user's local project for project-defined execution](adrs/adr-002.md) — checkout/environment is private and user-selected.
- [ADR-004: Connect each developer machine through an outbound HTTPS companion](adrs/adr-004.md) — journal, locks, native root, and recovery.
- [ADR-005: Require current structured gate evidence before gated success](adrs/adr-005.md) — manifest, truthful settlement, and pre-egress sanitization.

## Deliverables

- Local preparation and command execution with exact target provenance, durable journal/recovery, locks, and native real-root runtime support.
- Pinned instruction/gate policy, Playwright classification, gate ledger, safe evidence storage/DTOs, and truthful run settlement.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`.

- [x] `UT-044`, `UT-048`, `UT-059`–`UT-073`, `UT-076`–`UT-077`, `UT-104`–`UT-105`, `UT-121`–`UT-154`, `UT-163`–`UT-167`, `UT-169`–`UT-185` — executor/journal/protocol, native root, policy, gate, and evidence behavior.
- [x] `IT-040`–`IT-042`, `IT-044`–`IT-049`, `IT-051`–`IT-052`, `IT-057`–`IT-063`, `IT-066`–`IT-067`, `IT-129`–`IT-145`, `IT-158`–`IT-162`, `IT-221`–`IT-230` — local preparation, lifecycle, gate/evidence, action API, and queued command/event wiring.

### Deferred Gates

- [ ] `IT-043`, `IT-050`, `IT-053`–`IT-056`, `IT-065` (`feature-gate`) — native runtime, interaction, real Playwright outcomes, and host-choice regression.
- [ ] `E2E-010`–`E2E-012`, `E2E-016`–`E2E-017`, `E2E-019` (`qa-release`) — local action, required browser gate, disconnect/restart, accessibility, and offline terminal journal journeys.

## Success Criteria

- Every task-required test case implemented and passing.
- A local command has one durable effect across retry, process restart, and temporary disconnect.
- Required gates cannot appear passed when unrun, stale, blocked, failed, unknown, or tied to changed checkout/policy facts.
- Shared task views expose only bounded sanitized evidence and immutable safe provenance.
