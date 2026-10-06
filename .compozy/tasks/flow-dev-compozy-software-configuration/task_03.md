---
status: pending
title: "Add unified-flow persistence and legacy projection"
type: backend
complexity: high
---

# Task 03: Add unified-flow persistence and legacy projection

## Overview

Create the additive durable contract for an `os_unified` execution plan, actions, bindings, and immutable runs. At the same time, preserve legacy Spec workflows as a distinct, readable projection with their original packages and approvals unchanged.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST add execution-plan tables and indexes through an additive migration; it MUST NOT rewrite, reset, or reinterpret `task_spec_*` rows.
- MUST model plan revisions, ordered actions, explicit runtime bindings, immutable run snapshots, idempotency, and one active write-capable run per task.
- MUST keep searchable lifecycle data in side tables and restrict JSON to validated Loop input and immutable snapshot payloads.
- MUST expose a discriminated read projection so legacy package labels, IDs, and approval state remain exact.
- MUST preserve action/run identities when connection labels, availability, or workspace state later change.
</requirements>

## Subtasks

- [ ] 3.1 Define the unified plan, action, runtime-binding, and run schema modules.
- [ ] 3.2 Add the additive migration, constraints, indexes, and migration-fixture registration.
- [ ] 3.3 Define focused DAO contracts and persistence projections for unified flow data.
- [ ] 3.4 Implement a legacy projection that reads the existing Spec workflow without mutation.
- [ ] 3.5 Prove migration invariants, uniqueness, and legacy package preservation against populated fixtures.

## Implementation Details

Follow TechSpec “Data Models”, “Impact Analysis”, and “Safety Invariants”. This task establishes durable state only; task 04 owns save/start/admission behavior and task 05 owns unified artifact capture and review-package writes.

### Relevant Files

- `packages/api/src/infra/database/schema/tasks/spec.ts` — legacy workflow, attempt, stage, and active-attempt preservation boundary.
- `packages/api/src/infra/database/schema/tasks/specPackages.ts` — immutable legacy packages and approvals.
- `packages/api/src/infra/database/schema.ts` — schema export boundary.
- `packages/api/drizzle/0013_spec_workflow.sql` — latest additive migration precedent.
- `packages/api/src/application/database/dao/taskSpecDao.ts` — current Spec persistence contract.
- `packages/api/src/infra/database/dao/spec/drizzleTaskSpecDao.ts` — scoped workflow DAO pattern.
- `packages/api/test/database.ts` — migrated integration fixture setup.
- `packages/api/test/spec-schema.test.ts` and `packages/api/test/migrations.test.ts` — schema and migration test conventions.

### Dependent Files

- `packages/api/src/infra/database/schema/tasks/taskExecution.ts` — unified-flow table definitions.
- `packages/api/drizzle/0015_task_execution_flow.sql` — additive unified-flow migration and rollback/metadata where required by repository practice.
- `packages/api/src/application/database/dao/taskFlowDao.ts` — unified persistence contract.
- `packages/api/src/infra/database/dao/tasks/drizzleTaskFlowDao.ts` — task-flow projection and storage implementation.
- `packages/api/src/application/services/task-flow/legacyProjection.ts` — legacy-vs-unified safe reader.
- `packages/api/test/task-flow-schema.test.ts` — schema/migration invariant coverage.

### Related ADRs

- [ADR-005: Bind provider capabilities and worktree to each action](adrs/adr-005.md) — immutable selection and run provenance.
- [ADR-006: Follow the CompozyOS unified spec and Loop lifecycle](adrs/adr-006.md) — unified flow alongside legacy history.

## Deliverables

- Additive database schema and DAO contract for the new unified execution flow.
- A read-only legacy projection retaining original legacy labels, package IDs, and approval state.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] UT-018 — approved legacy PRD/Tech Spec workflow returns existing labels and package IDs unchanged.
## Success Criteria

- Every task-required test case implemented and passing.
- The migration is additive and passes populated-database preservation checks.
- New unified rows and legacy rows coexist without implicit conversion.
- The active-write constraint protects later admission work without changing legacy active attempts.
