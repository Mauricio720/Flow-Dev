---
status: completed
title: Focused authoring and assigned-work frontend
type: frontend
complexity: high
---

# Focused authoring and assigned-work frontend

## Overview

Separate the browser experience into focused issue authoring, assigned Ready/active work, durable work detail, and private local-project settings. The UI must make claim/operator/observer states honest while retaining readable historical authoring and never exposing local private data.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST keep authoring at `/projects/[projectId]/issues` and historical issue routes while removing downstream controls from that feature.
- MUST add thin work and local-settings routes with feature-owned client/server boundaries and no API server-runtime imports in browser code.
- MUST hide authoring mutations from non-admins and all operating controls from observers, pending claims, or denied sessions.
- MUST show explicit, accessible pt-BR states for empty/continuing queues, blocks, uncertainty, lost access, and local readiness.
- MUST clear cached private work data after a denied refresh and never render another user’s link/catalog/private evidence.
</requirements>

## Subtasks
- [x] 3.1 Restrict the issue-composer feature to authoring, history, publication result, and safe work navigation.
- [x] 3.2 Add assigned-work routes, loaders, contracts, and UI for Ready discovery, claim, active work, and durable detail.
- [x] 3.3 Render explicit operator and observer capabilities from the source/claim contract.
- [x] 3.4 Move downstream planning/spec/flow presentation ownership into assigned-work and promote only shared primitives.
- [x] 3.5 Add private local-project settings/link readiness presentation without cross-user disclosure.
- [x] 3.6 Update project shell, home destination, return paths, and navigation for current role and workspace.
- [x] 3.7 Cover accessible component states, denied refresh, pagination, and responsive journey fixtures.

## Implementation Details

Follow the TechSpec “Frontend ownership and UX” section, the current Next local documentation, `apps/web/DESIGN.md`, and feature-first ownership. This task consumes task 02 contracts; it does not implement browser-independent execution protocol behavior from task 04/05.

### Relevant Files
- `apps/web/src/app/projects/[projectId]/issues/page.tsx` and `apps/web/src/app/projects/[projectId]/issues/[taskId]/page.tsx` — retain thin authoring/history entries.
- `apps/web/src/features/issues/issue-composer/{components/Workspace.tsx,server/loadTaskWorkspace.ts}` — currently mix authoring with downstream flow.
- `apps/web/src/features/issues/issue-composer/components/PublishedResult.tsx` — publication result links to separate work.
- `apps/web/src/lib/navigation/{projectRoutes.ts,resolveHomeDestination.ts}` — new work/settings paths and safe return paths.
- `apps/web/src/features/projects/project-shell/` — role-aware work navigation and project shell sections.
- `apps/web/src/components/tasks/` — only reusable status/document primitives promoted from feature internals.

### Dependent Files
- `apps/web/src/app/projects/[projectId]/work/page.tsx` and `apps/web/src/app/projects/[projectId]/work/[taskId]/page.tsx` — new thin route entries.
- `apps/web/src/app/projects/[projectId]/settings/local-project/page.tsx` — private link/readiness route.
- `apps/web/src/features/issues/assigned-work/` and `apps/web/src/features/projects/local-project/` — new feature owners.
- `apps/web/e2e/{project-context,task-workspace,private-routes}.spec.ts` — browser fixtures for deferred gates.

### Related ADRs
- [ADR-001: Separate issue authoring from assigned issue work](adrs/adr-001.md) — routing and role separation.
- [ADR-003: Reuse task identity with verified source snapshots and reconciled claims](adrs/adr-003.md) — durable work detail and honest claim state.
- [ADR-005: Require current structured gate evidence before gated success](adrs/adr-005.md) — observer-safe gate/evidence display.

## Deliverables

- Feature-owned routes and components for focused authoring, assigned work, work detail, and local settings.
- Role-aware navigation and safe accessible states across author, operator, observer, and access-loss scenarios.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`.

- [x] `UT-010`, `UT-013`, `UT-020`, `UT-028`, `UT-032`, `UT-047`, `UT-050`, `UT-078`, `UT-155`–`UT-159` — workspace navigation, visible controls, list state, observer safety, recovery copy, local settings, and return-path behavior.

### Deferred Gates

- [ ] `E2E-001`–`E2E-002`, `E2E-008` (`feature-gate`) — focused authoring/non-admin/observer browser journeys.

## Success Criteria

- Every task-required test case implemented and passing.
- A user can move from publication to distinct assigned work without implicit claim, planning, or execution.
- Observers and non-admins see only allowed safe information and no mutation controls.
- Narrow-screen and keyboard-visible status controls remain understandable without color alone.
