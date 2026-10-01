---
status: pending
title: Build the catalog and project-context shell
type: frontend
complexity: high
---

# Build the catalog and project-context shell

## Overview

Make the project catalog the signed-in entry point and place the existing issue demonstration inside an explicit selected-project shell. The UI must make project, repository identity, personal connection state, navigation, and loss of access understandable without presenting simulated content as live repository data.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST route a signed-in person without a valid active selection to `/projects` before any project menu and restore only a still-authorized selection.
- MUST show only permitted projects, searchable by project or repository identity, with readable empty, error, checking, authorization-needed, unavailable, and archived states in pt-BR.
- MUST use `/projects/[projectId]` as explicit context for the shell and `/projects/[projectId]/issues` for the simulation; stale async responses MUST NOT replace the latest project context.
- MUST protect catalog, deep-link, selection, and menu behavior through the project API and hide menus after access revocation.
- MUST keep route entries thin, put product behavior under `features/projects/`, retain a minimal client boundary, and use inferred tRPC types.
</requirements>

## Subtasks
- [ ] 4.1 Replace the direct workspace landing flow with authorized project catalog routing and active-selection recovery.
- [ ] 4.2 Build the accessible paginated/searchable project catalog and its distinct empty and recoverable-error states.
- [ ] 4.3 Display saved repository identity and per-user connection state without blocking catalog rendering on GitHub.
- [ ] 4.4 Build the selected-project shell, context header, catalog navigation, and project switching behavior.
- [ ] 4.5 Relocate and key the issue demonstration under the selected project route, retaining an explicit simulation label.
- [ ] 4.6 Handle revoked, malformed, unavailable, and temporarily disconnected project routes without leaking previous project content.
- [ ] 4.7 Add focused component tests and preserve independent, accessible end-to-end fixtures for the deferred journeys.

## Implementation Details

Read `apps/web/PRODUCT.md`, `apps/web/DESIGN.md`, the current Next.js documentation in `apps/web/node_modules/next/dist/docs/`, and the app instructions before implementation. Follow the App Router ownership boundary: route entries compose `features/projects/`; the issue feature remains separate and receives explicit project context rather than owning routing.

### Relevant Files
- `apps/web/src/app/page.tsx` — currently bypasses project selection by rendering the workspace.
- `apps/web/src/app/dev/page.tsx` — current prototype catalog display.
- `apps/web/src/features/projects/project-catalog/index.tsx` — initial server-side catalog feature.
- `apps/web/src/features/projects/project-catalog/components/ProjectList.tsx` — current minimal project list.
- `apps/web/src/features/issues/issue-composer/index.tsx` — issue workspace feature to contextualize rather than merge into projects.
- `apps/web/src/features/issues/issue-composer/hooks/useWorkspace.ts` — local state that must reset for a changed project.
- `apps/web/src/lib/trpc/server.ts` and `apps/web/src/lib/trpc/client.ts` — established server/client tRPC access.

### Dependent Files
- `apps/web/src/app/projects/page.tsx` — catalog route to create.
- `apps/web/src/app/projects/[projectId]/page.tsx` — selected-project shell route to create.
- `apps/web/src/app/projects/[projectId]/issues/page.tsx` — project-scoped demonstration route to create.
- `apps/web/src/features/projects/` — catalog and shell feature modules to add without sibling-feature imports.
- `apps/web/src/app/login/page.tsx` — may receive valid return navigation from protected project routes.

### Related ADRs
- [ADR-003: Project catalog is the gateway to project menus](adrs/adr-003.md) — defines the project-first hierarchy.
- [ADR-002: Project membership and GitHub access both govern code use](adrs/adr-002.md) — drives visible state versus repository content.
- [ADR-006: Resolver estado de conexão por usuário e revalidar ações de repositório](adrs/adr-006.md) — requires non-authorizing connection UI.

## Deliverables

- Project-first catalog and shell routes with explicit, protected `projectId` context.
- Accessible pt-BR catalog, repository connection-state UI, switching, and no-project/revocation recovery.
- Existing issue demonstration nested under the selected project and labelled as simulated.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] UT-001, UT-002, UT-003 — catalog cards preserve identity, deduplicate pages, and safely render long/special labels.
- [ ] UT-004, UT-005 — idempotent selection and latest-selection-wins shell state.
- [ ] UT-035, UT-036 — catalog checking and recoverable-list-error states.
- [ ] UT-043, UT-044 — selected shell context changes and revoked-project recovery.

### Deferred Gates

- [ ] IT-001, IT-002, IT-003, IT-004, IT-005, IT-006, IT-007, IT-008, IT-009, IT-043 (`feature-gate`) — catalog/session/revocation/deep-link behavior.
- [ ] E2E-001, E2E-002, E2E-006, E2E-007 (`feature-gate`) — catalog, switching, missing repository access, and continuity journeys.

## Success Criteria

- Every task-required test case implemented and passing.
- No project-specific menu or simulated workspace is shown without an explicit authorized route context.
- Catalog and shell remain clear and safe when access changes or GitHub is unavailable.
