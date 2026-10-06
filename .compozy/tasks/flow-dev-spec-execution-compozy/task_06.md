---
status: completed
title: Workspace Issues, Human Views e estado cliente
type: frontend
complexity: high
---

# Task 06: Workspace Issues, Human Views e estado cliente

## Overview

Integrar o workflow Spec completo ao workspace Issues existente, mantendo a URL e as responsabilidades atuais. A interface apresenta progresso, interações, revisões PRD/TechSpec/Tasks e ações autorais fiéis ao snapshot persistido, enquanto leitores e administradores autorizados permanecem em modo observação.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. MUST keep UI ownership under `features/issues/issue-composer/spec/` and preserve `/projects/{projectId}/issues/{taskId}` as the entry URL.
- 2. MUST derive visible starts from the approved selected route and exact stage state; future links and `direct_execution` MUST explain availability without dispatching work.
- 3. MUST poll persisted snapshots/events incrementally with state-specific cadence, deduplication and authorization-aware cache clearing; it MUST NOT replace newer state with older reads.
- 4. MUST render validated source content, tables, code, links and diagrams safely; `MarkdownPreview` MUST NOT become the primary Human View.
- 5. MUST distinguish author commands from read-only observation and enforce accessible pt-BR controls, status announcements, reduced motion and retained focus/scroll.
</requirements>

## Subtasks
- [x] 6.1 Extend server loading, workspace contracts and query selectors for scoped initial Spec state.
- [x] 6.2 Compose route-aware Spec stage/progress into author and reader workspace flows.
- [x] 6.3 Implement snapshot/event polling and uncertain-command state isolated from planning state.
- [x] 6.4 Implement prominent activity, pending question and permission presentation.
- [x] 6.5 Build PRD, TechSpec and Tasks Human Views from validated package/document data.
- [x] 6.6 Add safe links, inert rich-content rendering, accessible tables and sandboxed diagrams.
- [x] 6.7 Implement review changes, adjustment, cancellation, retry, return and approval controls.
- [x] 6.8 Add component, hook and end-to-end fixtures covering author, reader and administrator behavior.

## Implementation Details

Read `apps/web/AGENTS.md` and the relevant current Next.js documentation before implementation. Follow TechSpec section “Human View and client behavior”; backend parsing/validation belongs to task 04, so this task consumes validated blocks and diagnostics rather than re-parsing Markdown client-side.

### Relevant Files
- `apps/web/src/app/projects/[projectId]/issues/[taskId]/page.tsx` — thin server route entry and selector decoding.
- `apps/web/src/features/issues/issue-composer/server/loadTaskWorkspace.ts` — cached server-caller loader and scoped initial state.
- `apps/web/src/features/issues/issue-composer/contract.ts` — inferred tRPC contract extension point.
- `apps/web/src/features/issues/issue-composer/components/Workspace.tsx` — workspace composition and live-region context.
- `apps/web/src/features/issues/issue-composer/components/AuthorStage.tsx` and `ReaderStage.tsx` — author/read-only split.
- `apps/web/src/features/issues/issue-composer/components/PlanningStage.tsx` and `PlanningActions.tsx` — planning-to-Spec transition composition.
- `apps/web/src/features/issues/issue-composer/hooks/usePolling.ts` and `usePlanningCommand.ts` — polling and uncertain-command precedents.
- `apps/web/src/features/issues/issue-composer/components/MarkdownPreview.tsx` — retained only for existing Issue previews, not suitable as Human View.

### Dependent Files
- `apps/web/src/features/issues/issue-composer/spec/` — new Spec components, hooks, models, copy and presentation helpers.
- `apps/web/src/features/issues/issue-composer/hooks/useTaskWorkspace.ts` — integration of Spec refresh state.
- `apps/web/src/features/issues/issue-composer/components/TaskStage.tsx` — Spec stage placement in the existing workspace.
- `apps/web/package.json` and `pnpm-lock.yaml` — actual GFM/diagram/sanitization dependencies when selected.
- `apps/web/src/test/` and `apps/web/e2e/task-workspace.spec.ts` — tRPC fixtures, component harnesses and workflow E2E coverage.

### Related ADRs
- [ADR-001: Follow the approved planning route through Spec and Tasks](adrs/adr-001.md) — route sequence and explicit starts.
- [ADR-003: Review every stage through a Human View and request changes from the agent](adrs/adr-003.md) — substantive review and exact approval.
- [ADR-004: Preserve context across interactive runs, cancellation, and retry](adrs/adr-004.md) — interaction and recovery visibility.
- [ADR-008: Persist a separate Spec lifecycle and deliver a cursor-based live projection](adrs/adr-008.md) — snapshot/event polling.
- [ADR-010: Build faithful stage-specific Human Views from a validated document model](adrs/adr-010.md) — safe faithful rendering.

## Deliverables

- Route-aware, accessible Spec workspace composed into the existing Issues feature.
- Live state, interactions, exact review views and author-only recovery/approval controls driven by persisted data.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-041, UT-042, UT-043, UT-044, UT-045, UT-046, UT-047, UT-048, UT-049, UT-050, UT-051, UT-052, UT-053, UT-054, UT-055, UT-056, UT-057, UT-058, UT-059, UT-060, UT-061, UT-062 — stage/progress, activity, interaction, all Human Views, diff/actions, polling/commands and safe link presentation.
- [x] IT-003, IT-006, IT-022, IT-023, IT-026, IT-030, IT-040, IT-050, IT-053, IT-060, IT-063, IT-070, IT-080, IT-090, IT-093, IT-100, IT-110, IT-120 — UI state, scale and presentation behavior.
- [x] IT-130, IT-131, IT-132, IT-133, IT-134, IT-135, IT-136, IT-137, IT-138, IT-139, IT-140, IT-141, IT-142, IT-143, IT-144, IT-145, IT-146, IT-147, IT-148, IT-150 — reader/admin scope, paging, revision, access-loss and current-state behavior.
- [x] IT-237, IT-238 — visibility-aware polling and identity-safe pending command handling.

## Success Criteria

- Every task-required test case implemented and passing.
- Authors can supervise and explicitly control eligible Spec work; readers/admins observe only within current access.
- Every material document block is visible or represented by a blocking diagnostic, with no executable generated content.
