---
status: completed
title: Persist the durable planning foundation
type: backend
complexity: high
---

# Persist the durable planning foundation

## Overview

Add the typed, additive persistence and domain foundation that lets a confirmed published task enter planning without changing the publication fact. This makes retained publication snapshots, one immutable current decision, eligibility, and concurrency primitives trustworthy before any command, worker, or UI consumes them.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST retain `tasks.status = published` and project `awaiting` without backfilling or writing historical tasks.
- MUST persist one decision per task with same-task publication/operation association, database checks, and immutable approved records.
- MUST accept planning only from the retained confirmed publication snapshot; live GitHub, drafts, sessions, tokens, URLs, and conversation content MUST NOT replace or enter its provider input.
- MUST enforce content limits, canonical hashing, and safe eligibility results without truncating content or fabricating a decision.
</requirements>

## Subtasks
- [x] 1.1 Define planning routes, statuses, assessment, decision, input, limits, and domain validation.
- [x] 1.2 Extend task, operation, publication-attempt, and receipt persistence with additive planning invariants.
- [x] 1.3 Generate and register a reversible additive Drizzle migration and schema test harness entry.
- [x] 1.4 Implement eligibility, fixed-order request hashing, and retained-snapshot input construction.
- [x] 1.5 Add dedicated planning DAO contracts and claim-current primitives without altering generation settlement behavior.
- [x] 1.6 Enforce decision uniqueness, association guards, enum/content checks, and immutability at database level.
- [x] 1.7 Cover domain and PostgreSQL invariants with focused unit and integration fixtures.

## Implementation Details

Follow TechSpec C01/C03 and the data-model/state-projection sections. Generate the migration number from the current journal, keep domain rules independent of ORM/transport, and keep files below repository size limits.

### Relevant Files
- `packages/api/src/infra/database/schema/tasks/records.ts` — tasks and command receipts gain planning state and references.
- `packages/api/src/infra/database/schema/tasks/operations.ts` — extend kind, active-operation, and plan association constraints.
- `packages/api/src/infra/database/schema/tasks/boundaries.ts` — confirmed publication snapshot is the sole planning basis.
- `packages/api/src/infra/database/schema.ts` — aggregate schema export.
- `packages/api/src/infra/database/dao/tasks/taskCommandHelpers.ts` — receipt-hash precedent; planning needs canonical fixed-order hashing.
- `packages/api/src/infra/database/dao/tasks/taskOperationClaim.ts` — lease/fence claim precedent.
- `packages/api/test/database.ts` — hard-coded migration registration.

### Dependent Files
- `packages/api/src/application/database/dao/taskDao.ts` — subsequent read/command composition consumes planning records.
- `packages/api/src/infra/database/dao/tasks/drizzleTaskDao.ts` — facade will compose focused planning DAOs.
- `packages/api/src/infra/database/dao/tasks/drizzleTaskReadDao.ts` — task 02 maps planning projections.
- `packages/api/src/controllers/taskWorkerController.ts` — task 03 adds `plan` scheduling without disturbing other kinds.

### Related ADRs
- [ADR-001: Continue the existing change through planning in Issues](adrs/adr-001.md) — continuity and snapshot identity.
- [ADR-005: Extend published tasks with durable local planning](adrs/adr-005.md) — additive persistence and worker boundaries.
- [ADR-006: Define a dedicated snapshot-only Dev Control planning protocol](adrs/adr-006.md) — input/hash boundaries.
- [ADR-007: Version route review and render typed artifacts](adrs/adr-007.md) — versioned decision integrity.

## Deliverables

- Domain contracts/rules and planning DAO foundations.
- Registered additive migration with PostgreSQL constraints, indexes, and immutable-decision protection.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

- [x] UT-001, UT-002, UT-003, UT-004 — strict planning-assessment parsing and content limits.
- [x] UT-005, UT-006, UT-007 — confirmed-publication eligibility and historical projection.
- [x] UT-008, UT-009, UT-010, UT-011 — selection provenance and exact-review validation.
- [x] UT-012, UT-013, UT-014 — snapshot-only input and byte/code-point limits.
- [x] UT-019 — fixed-order planning command hash.
- [x] UT-023, UT-024, UT-025, UT-026 — claim-current and bounded retry-delay rules.
- [x] IT-001 — migration and historical published-task compatibility.
- [x] IT-047, IT-048, IT-049, IT-050 — uniqueness, FKs, immutable decision trigger, and schema checks.
- [x] IT-078 — application guards reject uncertain publication or non-plan producing operation association.

## Success Criteria

- Every task-required test case implemented and passing.
- A retained confirmed Issue is the only permitted planning source and no planning row rewrites it.
- PostgreSQL prevents conflicting, malformed, or mutable approved planning decisions.
