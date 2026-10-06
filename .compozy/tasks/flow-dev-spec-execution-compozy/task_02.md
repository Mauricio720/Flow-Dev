---
status: completed
title: Plataforma Compozy, workspaces isolados e bundle gerenciado
type: infra
complexity: high
---

# Task 02: Plataforma Compozy, workspaces isolados e bundle gerenciado

## Overview

Provisionar a plataforma de execução Spec independente do worker de tarefas existente. A fatia fornece o adaptador Compozy pinado, checkout isolado, preflight fail-closed, worker dedicado e o bundle de skills que produz os documentos separados exigidos.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. MUST pin and verify the selected Compozy release, OpenAPI, provider and managed-bundle identities before work is admitted.
- 2. MUST use a dedicated Spec worker, private runtime/session per attempt and rootless isolated workspace; it MUST NOT consume `tasksWorker` slots.
- 3. MUST require refreshed personal repository credentials even for public repositories and MUST keep tokens out of URLs, argv, environment, Git config and logs.
- 4. MUST create and maintain three separate-document skills; read and follow the repository `skill-creator` instructions before creating or changing them.
</requirements>

## Subtasks
- [x] 2.1 Define typed Spec runner configuration, limits and preflight diagnostics.
- [x] 2.2 Implement the narrow runtime gateway for the pinned Compozy protocol.
- [x] 2.3 Implement isolated checkout preparation and candidate-workspace provisioning.
- [x] 2.4 Establish rootless container, UDS, egress and permission-policy boundaries.
- [x] 2.5 Add the independent worker CLI and composition without changing ordinary worker capacity.
- [x] 2.6 Create the versioned PRD, TechSpec and Tasks managed skill bundle with compatibility fixtures.
- [x] 2.7 Test configuration, pinning, credential handling, gateway and workspace failure modes.

## Implementation Details

Follow TechSpec sections “Pinned Compozy protocol and evidence”, “Workspace, isolation and artifact consistency”, and “Development Sequencing”. This task exposes gateways for later supervision only; it does not own document capture, event persistence or lifecycle mutations.

### Relevant Files
- `packages/api/src/cli/tasksWorker.ts` — shutdown, loop and heartbeat reference; its two slots must remain untouched.
- `packages/api/src/controllers/taskWorkerController.ts` — worker admission and polling precedent.
- `packages/api/src/infra/planningComposition.ts` — isolated factory/composition precedent.
- `packages/api/src/application/services/projects/repositoryAccessService.ts` — repository authorization and refreshed credentials boundary.
- `packages/api/src/application/github/repositoryAuthorizationService.ts` — personal GitHub authorization dependency.
- `packages/api/package.json` — existing CLI scripts and package dependencies.
- `docker-compose.yml` — documents that the current Compose stack is PostgreSQL only, not the Spec host.

### Dependent Files
- `packages/api/src/application/spec/specRuntimeGateway.ts` — new application runtime contract.
- `packages/api/src/application/spec/specWorkspaceGateway.ts` — new application workspace contract.
- `packages/api/src/infra/spec/compozy/` — pinned runtime adapter implementation.
- `packages/api/src/infra/spec/workspace/` — checkout, isolation and candidate workspace implementation.
- `packages/api/src/infra/spec/specConfiguration.ts` and `packages/api/src/cli/specWorker.ts` — configuration and dedicated process.
- `packages/api/resources/spec/` — managed skills, templates, schemas and compatibility fixtures.

### Related ADRs
- [ADR-002: Keep separate PRD and Tech Spec documents on Compozy 0.3](adrs/adr-002.md) — required artifact separation.
- [ADR-005: Keep repository artifacts and the Flow Dev review synchronized without Git publication](adrs/adr-005.md) — local-only destination boundary.
- [ADR-006: Run a dedicated Flow Dev worker with automatically provisioned isolated checkouts](adrs/adr-006.md) — execution topology and isolation.
- [ADR-007: Pin Compozy and maintain separate-document workflow contracts](adrs/adr-007.md) — runtime and bundle compatibility gate.

## Deliverables

- Pinned, preflighted Compozy/runtime/workspace gateway and independent `spec:worker` entry point.
- Rootless isolated checkout model and managed separate-document skill bundle with fixtures.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-015, UT-016, UT-017, UT-018, UT-019, UT-020, UT-027, UT-028, UT-029, UT-030 — worker fencing, runtime/workspace contracts, bundle and canonical Spec input.
- [x] UT-063, UT-064, UT-065, UT-066, UT-067, UT-068, UT-069, UT-070, UT-071, UT-072, UT-073, UT-074, UT-075, UT-076, UT-081, UT-082 — runtime outcomes, manifests, limits, permission boundary and CLI configuration.
- [x] IT-013, IT-019, IT-020, IT-036, IT-043, IT-046, IT-066, IT-067, IT-069 — admission, workspace, runtime and pinned input behavior.
- [x] IT-103, IT-106, IT-113, IT-114, IT-119, IT-121, IT-125, IT-126, IT-127, IT-149 — platform boundary, credential, workspace and entitlement cases.
- [x] IT-201, IT-202, IT-203, IT-211, IT-212, IT-213, IT-230, IT-231, IT-232, IT-236, IT-239 — session/prompt uncertainty, stop inspection, safe inputs, isolation and CLI behavior.

## Success Criteria

- Every task-required test case implemented and passing.
- Spec admission fails closed when configuration, pin, access or isolation evidence is invalid.
- The ordinary tasks worker remains operationally and capacity-wise independent.
