---
status: completed
title: "Review unified spec packages in the task workspace"
type: frontend
complexity: high
---

# Task 05: Review unified spec packages in the task workspace

## Overview

Add the unified `os_spec_v1` capture and review experience to the task workspace while retaining the existing PRD, Tech Spec, and Tasks history unchanged. Authors can approve one exact valid unified package and then explicitly make `create_tasks` eligible; readers receive only safe artifacts and provenance.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST capture or consume a versioned `os_spec_v1` package only after `_spec.md` Product and Technical parts and required companion manifests validate.
- MUST approve one exact package version through `taskFlow.approvePackage`; incomplete, stale, or invalid packages MUST NOT be approvable.
- MUST show `cy-create-tasks` only after exact unified-spec approval and require a separate explicit author action to start it.
- MUST preserve the legacy `taskSpec` UI, labels, packages, and approval history as a distinct read path without conversion or duplicate spec creation.
- MUST give readers safe artifact/provenance visibility but no author controls or credential-related data, using accessible pt-BR states.
</requirements>

## Subtasks

- [x] 5.1 Define unified package validation, manifest, and review projection without changing legacy package format.
- [x] 5.2 Select the unified or legacy workspace rendering path from the flow discriminator.
- [x] 5.3 Add unified spec, companion, diagnostic, historical-version, and safe provenance views.
- [x] 5.4 Add exact-version approval, conflict, and recovery interactions for authors.
- [x] 5.5 Expose `create_tasks` eligibility after approval without auto-starting it.
- [x] 5.6 Maintain reader/author separation, focus behavior, status text, and narrow-layout presentation.
- [x] 5.7 Add unit, integration, and UI coverage for invalid packages and legacy coexistence.

## Implementation Details

Follow TechSpec “Unified artifact package”, “API Endpoints”, and development sequencing step 4, plus `_uiux.md` “Review and history”. Use the new task-flow contract from task 04; do not extend legacy `prd | tech_spec | tasks` assumptions to unified data. Implementation must follow the App Router, tRPC, backend layering, design, and Next.js documentation requirements recorded in `apps/web/AGENTS.md`.

### Relevant Files

- `apps/web/src/features/issues/issue-composer/spec/SpecStage.tsx` — legacy Spec composition boundary.
- `apps/web/src/features/issues/issue-composer/spec/SpecStageBody.tsx` and `SpecPackageView.tsx` — current package rendering patterns.
- `apps/web/src/features/issues/issue-composer/spec/SpecReviewActions.tsx` — review command interaction pattern.
- `apps/web/src/features/issues/issue-composer/spec/PrdReview.tsx`, `TechSpecReview.tsx`, and `TasksReview.tsx` — legacy stage-specific views to preserve.
- `apps/web/src/features/issues/issue-composer/server/loadTaskWorkspace.ts` — workspace server loading boundary.
- `apps/web/src/features/issues/issue-composer/spec/specVisibility.ts` — reader/author visibility model.
- `packages/api/src/infra/database/dao/spec/specPackageReads.ts` and `specApproveGate.ts` — legacy package read/approval boundary.

### Dependent Files

- `packages/api/src/application/services/task-flow/artifactValidator.ts` — unified package/companion validation.
- `packages/api/src/application/services/task-flow/packageCapture.ts` — immutable `os_spec_v1` capture projection.
- `apps/web/src/features/issues/issue-composer/spec/unified/` — feature-owned unified package and review components.
- `apps/web/src/features/issues/issue-composer/spec/specContract.ts` — discriminated legacy/unified view contract.
- `apps/web/src/features/issues/issue-composer/components/AuthorStage.tsx` and `ReaderStage.tsx` — workspace composition and control separation.
- `apps/web/src/test/taskFlow.ts` and colocated unified-review tests — safe task-flow fixtures and UI coverage.

### Related ADRs

- [ADR-005: Bind provider capabilities and worktree to each action](adrs/adr-005.md) — package provenance remains tied to accepted action snapshots.
- [ADR-006: Follow the CompozyOS unified spec and Loop lifecycle](adrs/adr-006.md) — canonical unified spec and legacy history coexistence.

## Deliverables

- Validated immutable unified-spec package capture and exact-version approval.
- Accessible unified review/provenance UI alongside the unchanged legacy review path.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-017 — `_spec.md` missing its Technical part returns `package_invalid` without creating a review package.
- [x] IT-104 — an existing legacy split-stage task retains its route and approved package identifiers with no automatic conversion or duplicate unified spec.

### Deferred Gates

- [ ] IT-106, IT-107 (`feature-gate`) — exact unified-package approval succeeds only for the requested current version.
- [ ] E2E-003 (`feature-gate`) — author explicitly runs and reviews a unified create-spec package before approving its exact version.
- [ ] E2E-006 (`feature-gate`) — legacy package IDs remain unchanged after later Software configuration writes.

## Success Criteria

- Every task-required test case implemented and passing.
- Unified review presents one valid spec with its required companions and exact-version approval.
- Approval never starts `create_tasks` or any Loop.
- Legacy review remains readable under original labels and readers receive no mutable controls or secrets.
