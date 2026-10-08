---
status: completed
title: Operator authorization and source-aware downstream work
type: backend
complexity: critical
---

# Operator authorization and source-aware downstream work

## Overview

Make focused authoring administrator-only and move all downstream mutation authority from historical authorship to the completed claim operator. Adapt planning, specification, task flow, workers, and provenance to consume immutable verified sources while preserving legacy packages and history.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST enforce the current administrator rule at every authoring entry point; historical authoring may remain readable only under current project/repository access.
- MUST use one shared `WorkAuthorization` policy for downstream reads, operator mutations, DAO acceptance, and worker dispatch; administrator or author identity MUST NOT bypass it.
- MUST accept verified imported sources without fabricated publication attempts and preserve byte-for-byte legacy publication input reconstruction.
- MUST bind planning, decisions, packages, and runs to source/requester/operator provenance and block stale sources or unresolved claims.
- MUST remove planning approval’s Ready placement side effect; only a verified claim owns the initial move to `In Progress`.
</requirements>

## Subtasks
- [x] 2.1 Apply fresh administrator authorization across creation, draft, capture, dictation, approval, and publication paths.
- [x] 2.2 Add shared read/operate policy and inject it into every downstream controller, DAO acceptance path, and worker composition.
- [x] 2.3 Adapt planning requests, decisions, and reconfirmation to immutable verified source snapshots.
- [x] 2.4 Preserve legacy publication hashes, packages, approvals, and workers while representing imported authors/provenance truthfully.
- [x] 2.5 Remove planning-to-Ready behavior and its obsolete composition dependencies.
- [x] 2.6 Carry requester identity and exact local/host target facts through task-flow records and mappers.
- [x] 2.7 Prove policy, stale-source, legacy, operation, and worker contracts end to end.

## Implementation Details

Use the source and claim contract from task 01. This task owns the TechSpec sections “Authorization, source changes and downstream compatibility” and the planning/spec/task-flow portions of the Build Order; do not introduce local companion effects yet.

### Relevant Files
- `packages/api/src/controllers/{tasksController,taskPublicationController,taskPlanningController,taskSpecController,taskFlowController}.ts` — current mutation rules are author-centric.
- `packages/api/src/application/services/access/projectAccessService.ts` — current-admin policy source.
- `packages/api/src/application/services/tasks/{planningService,planningRules,planningTransitions}.ts` — source-aware planning behavior.
- `packages/api/src/infra/database/dao/tasks/{planningStart,planningWorkerClaim,planningWorkerInput,planningProjection,planningWorkerSettlement}.ts` — publication-only planning joins and source/provenance persistence.
- `packages/api/src/application/services/spec/specEligibility.ts` and `packages/api/src/infra/database/dao/spec/` — source-aware spec admission.
- `packages/api/src/application/services/task-flow/` and `packages/api/src/infra/database/dao/tasks/{drizzleTaskFlowDao,taskFlowMappers,taskFlowRunStore,taskFlowPlanStore}.ts` — downstream policy, requester, and target round-trip.
- `packages/api/src/infra/{planningComposition,specComposition,taskFlowComposition,taskFlowWorkerComposition}.ts` — production dependency composition.

### Dependent Files
- `apps/web/src/features/issues/assigned-work/` — task 03 renders the operator/observer capabilities supplied by this policy.
- `packages/api/src/application/services/local-execution/` — task 05 requires policy scope before creating a local action.
- `packages/api/src/infra/spec/localProjectAccess.ts` — task 04/05 replace the server-path assumption after compatible authorization is available.

### Related ADRs
- [ADR-001: Separate issue authoring from assigned issue work](adrs/adr-001.md) — authoring ends at publication and is administrator-only.
- [ADR-003: Reuse task identity with verified source snapshots and reconciled claims](adrs/adr-003.md) — operator authority, verified source, and legacy compatibility.

## Deliverables

- Administrator authoring policy and shared `WorkAuthorization` composed in every affected backend path.
- Source-aware planning/spec/task-flow integration with operator/requester provenance and no planning Ready transition.
- Legacy-compatible records, DTOs, errors, workers, and regression coverage.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`.

- [x] `UT-001`–`UT-009`, `UT-011`–`UT-012`, `UT-014`, `UT-029`–`UT-031`, `UT-033`–`UT-043`, `UT-045`–`UT-046`, `UT-049`, `UT-051`, `UT-074`–`UT-075`, `UT-085`, `UT-092`–`UT-093`, `UT-095`–`UT-103`, `UT-160`–`UT-161`, `UT-168` — authoring policy, WorkAuthorization, source adapters, planning/spec/task-flow compatibility, and provenance.
- [x] `IT-019`–`IT-030`, `IT-068`, `IT-102`–`IT-108`, `IT-146`–`IT-157` — role/worker guards, source re-evaluation, legacy parity, and protected-operation contracts.

### Deferred Gates

- [ ] `IT-031` (`feature-gate`) — cutover drains/reconciles a legacy active operation without unattended restart.
- [ ] `E2E-006`–`E2E-007` (`feature-gate`) — source assessment and explicit downstream action journey.

## Success Criteria

- Every task-required test case implemented and passing.
- A non-admin cannot create or mutate authoring state, and an observer/author who is not operator cannot mutate downstream work.
- Imported and legacy published tasks follow the same explicit planning/spec/task-flow journey without false publication facts.
- Planning approval cannot move a board item to Ready.
