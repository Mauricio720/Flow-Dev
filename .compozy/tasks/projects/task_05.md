---
status: pending
title: Build administrator repository selection and project management
type: frontend
complexity: medium
---

# Build administrator repository selection and project management

## Overview

Provide the administrator-only flows that select an accessible GitHub repository, create a repository-backed project, and edit descriptive details without changing its code identity. These routes complete the project experience by preserving form drafts through recoverable failures and giving members read-only detail visibility.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST expose `/projects/new` and `/projects/[projectId]/settings` only through server-validated administrator behavior, with no private repository detail before authorization.
- MUST support paginated GitHub candidate search and safe direct `owner/name` preview without silent truncation, arbitrary URL fetching, or selection of an already-linked repository.
- MUST explain repository authorization, denial, organization approval, rate limit, temporary failure, and no-result states distinctly in pt-BR while preserving unsubmitted drafts.
- MUST create only from a reviewed verified repository and surface duplicate outcomes with a safe existing-project destination.
- MUST allow only name and description edits, use the returned details version for conflict review, and show repository identity as immutable read-only context.
</requirements>

## Subtasks
- [ ] 5.1 Create the protected administrator project-creation route and its feature-owned form flow.
- [ ] 5.2 Build accessible repository authorization guidance, paginated candidate search, direct preview, and linked-project state.
- [ ] 5.3 Build reviewed project creation with client validation, draft retention, conflict recovery, and catalog return.
- [ ] 5.4 Create the protected settings route with read-only repository identity and versioned descriptive edit controls.
- [ ] 5.5 Implement edit conflict review, invalid-field feedback, and member read-only presentation.
- [ ] 5.6 Connect the flows to inferred tRPC contracts without moving server runtime or credentials into client code.
- [ ] 5.7 Add focused component tests and prepare independent Playwright fixtures for deferred admin journeys.

## Implementation Details

Follow the App Router and tRPC placement rules already established by task 04. Keep picker, create, and settings behavior inside feature-owned modules under `features/projects/`; route files may load data and compose the public feature entry only. Consume no credential or GitHub runtime directly in the browser.

### Relevant Files
- `apps/web/src/features/projects/` — owner boundary established by the catalog and shell task.
- `apps/web/src/lib/trpc/client.ts` — existing client tRPC transport.
- `apps/web/src/lib/trpc/server.ts` — existing server caller for protected route data.
- `packages/api/src/schemas/projects.ts` — validated create, preview, and update inputs.
- `packages/api/src/routers/projects.ts` — inferred procedures consumed by these views.
- `apps/web/src/components/icons.tsx` — current shared icon surface, if a generic visual primitive is genuinely reusable.

### Dependent Files
- `apps/web/src/app/projects/new/page.tsx` — administrator creation route to create.
- `apps/web/src/app/projects/[projectId]/settings/page.tsx` — administrator settings route to create.
- `apps/web/src/features/projects/project-catalog/` — catalog can link to creation and refresh after successful create.
- `apps/web/src/features/projects/project-shell/` — shell can link to read-only/settings detail behavior.
- `apps/web/src/app/api/github-repositories/connect/route.ts` — task 02 authorization endpoint used by the authorization guidance action.

### Related ADRs
- [ADR-001: One GitHub repository is the project source of truth](adrs/adr-001.md) — creation chooses exactly one verified repository.
- [ADR-003: Project catalog is the gateway to project menus](adrs/adr-003.md) — administrators manage projects within the project-first hierarchy.
- [ADR-004: Autorizar repositórios com um segundo aplicativo OAuth GitHub](adrs/adr-004.md) — shapes authorization guidance and consent continuation.
- [ADR-005: Persistir identidade imutável do repositório e migrar o catálogo legado](adrs/adr-005.md) — repository is read-only during details edit.

## Deliverables

- Administrator-only repository picker, review, and project creation flow with recoverable authorization/failure states.
- Version-aware project details editor that never offers a repository replacement.
- Read-only member detail behavior and accessible pt-BR form feedback.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] UT-006, UT-007 — safe direct repository input and paginated-picker empty-state distinction.
- [ ] UT-008, UT-009 — creation form name and optional-description validation.
- [ ] UT-010, UT-011, UT-012 — detail normalization, description clearing, and compact-card identity presentation.
- [ ] UT-037, UT-038 — linked-candidate disablement and retryable picker failure with preserved draft.
- [ ] UT-039, UT-040 — one create submission and repository-conflict recovery.
- [ ] UT-041, UT-042 — immutable repository edit form and stale-version review.

### Deferred Gates

- [ ] E2E-003, E2E-004, E2E-005 (`feature-gate`) — repository consent/picker, create, and edit member/admin journeys.

## Success Criteria

- Every task-required test case implemented and passing.
- Administrators can only create a project from an accessible verified repository and cannot retarget an existing one.
- Failed authorization, search, creation, and edit attempts leave users with actionable feedback and intact drafts.
