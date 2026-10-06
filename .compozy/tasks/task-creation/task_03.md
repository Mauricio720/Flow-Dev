---
status: completed
title: Canonical review and safe GitHub publication
type: backend
complexity: high
---

# Task 03: Canonical review and safe GitHub publication

## Overview
Deliver the canonical editable draft, deterministic preview and the explicit GitHub Issue publication boundary. It preserves author edits and makes external creation at-most-once per possibly successful attempt, retaining uncertainty until attributable evidence resolves it.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST validate and render one canonical draft into exactly the title and Markdown body shown in preview.
- MUST save immutable revisions and apply only author-selected refinement paths while preserving unrelated manual content.
- MUST require a fresh, personally bound repository identity and Issue eligibility before approval and dispatch.
- MUST persist an approved snapshot and dispatch fence before external creation, with no automatic retry after ambiguous delivery.
- MUST retain confirmed snapshots and block uncertain attempts until conclusive original evidence resolves them.
</requirements>

## Subtasks
- [x] 3.1 Implement canonical draft validation, source safety, source labels and deterministic Markdown rendering.
- [x] 3.2 Implement revision saving, refinement proposals and selected-field conflict resolution.
- [x] 3.3 Add preview, publication approval and safe task-router operations.
- [x] 3.4 Extend GitHub integration with Issue eligibility, creation receipts and verified destination identity.
- [x] 3.5 Implement publication recovery states, reconciliation and durable published snapshots.
- [x] 3.6 Exercise all protected publication and review failure reasons through the real API boundary.

## Implementation Details
Use the TechSpec lifecycle and publication contracts verbatim for ordering and failures. Do not add labels, markers, comments, conversation content or audio to the GitHub Issue; only the approved title and body may cross the external boundary.

### Relevant Files
- `packages/api/src/application/services/projects/repositoryAccessService.ts` — current repository checks require publication-specific expansion.
- `packages/api/src/infra/github/githubRepositoryGateway.ts` — established GitHub HTTP conventions.
- `packages/api/src/controllers/projectsController.ts` — error translation pattern for GitHub failures.
- `packages/api/src/routers/index.ts` — tasks router already registered by task 01.
- `packages/api/src/application/auth/destination.ts` — safe destination normalization convention.

### Dependent Files
- `packages/api/src/application/services/tasks/` — draft, source, refinement, publication and recovery services.
- `packages/api/src/application/github/` — Issue eligibility and creation contracts.
- `packages/api/src/infra/github/` — GitHub Issue HTTP adapter.
- `packages/api/src/controllers/` and `packages/api/src/routers/` — preview, publish and reconciliation procedures.

### Related ADRs
- [ADR-001: Create one reviewed GitHub Issue from each task](adrs/adr-001.md) — explicit approval and canonical publication.
- [ADR-007: Bind the existing Issue Author to an operation-scoped context broker](adrs/adr-007.md) — evidence and refinement rules.
- [ADR-008: Dispatch publication once and preserve unresolved uncertainty](adrs/adr-008.md) — no blind retry after an ambiguous dispatch.

## Deliverables
- Canonical revision, source binding, preview and selected-field refinement behavior.
- GitHub Issue gateway with eligibility, receipt validation and no automatic creation retry.
- Protected preview, publish and reconciliation procedures with durable uncertainty recovery.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-021, UT-022, UT-023, UT-024, UT-025, UT-026 — publication draft validation, renderer and selected-field merge.
- [x] UT-029, UT-030, UT-031, UT-032, UT-033, UT-034 — approval, recovery and GitHub Issue receipt classification.
- [x] UT-075, UT-076, UT-077, UT-078, UT-082, UT-083, UT-084, UT-085, UT-086, UT-087, UT-088 — canonical bounds, eligibility and creation ambiguity.
- [x] UT-108 — renamed-destination preview invalidation.
- [x] IT-011, IT-012, IT-013 — preview, publication approval and reconciliation router contracts.
- [x] IT-014, IT-015, IT-016, IT-017, IT-018, IT-019, IT-020, IT-021, IT-022, IT-023, IT-024, IT-025, IT-026, IT-027, IT-028, IT-029, IT-030, IT-031, IT-032, IT-033, IT-034, IT-035, IT-036, IT-037, IT-038, IT-039, IT-040, IT-041, IT-042, IT-043, IT-044, IT-045, IT-046 — protected tRPC failures across the complete task API.
- [x] IT-190, IT-191, IT-192, IT-193, IT-195, IT-196 — canonical manual edit and save failure behavior.
- [x] IT-197, IT-198, IT-199, IT-200, IT-203, IT-205 — refinement proposals, conflict and selected-field resolution.
- [x] IT-207, IT-208, IT-209, IT-210, IT-213, IT-215 — explicit approval, destination validation and rejection behavior.
- [x] IT-227, IT-228, IT-229, IT-230, IT-232, IT-234 — durable published snapshot and safe historical result behavior.

### Deferred Gates

- [ ] IT-174 through IT-182, IT-185, IT-187, IT-189 — real generation/evidence interaction with canonical review.
- [ ] IT-194, IT-201, IT-202, IT-204, IT-206, IT-211, IT-212, IT-214, IT-216 through IT-226, IT-231, IT-233, IT-235 — integration recovery, races and no-duplicate publication gates.

## Verification evidence

- API unit tests: 151 passed; API PostgreSQL integration tests: 136 passed.
- Web tests: 129 passed; API and web typechecks passed; monorepo lint passed.
- Web production build passed with disposable PostgreSQL and local build-only auth values.
- Dev_Control Issue Author contract tests: 6 passed; production build passed.

## Success Criteria
- Every task-required test case implemented and passing.
- The preview bytes equal the title/body sent to GitHub for an approved revision.
- An ambiguous external creation never triggers another blind POST and remains visibly recoverable.
