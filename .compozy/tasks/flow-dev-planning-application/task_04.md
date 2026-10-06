---
status: completed
title: Deliver the planning experience in the Issues workspace
type: frontend
complexity: high
---

# Deliver the planning experience in the Issues workspace

## Overview

Extend the existing Issues workspace so published work transparently proceeds through awaiting analysis, processing, review, failure recovery, and read-only approval. The author sees a structured Portuguese Human View and deliberate route controls; authorized readers see the same trustworthy artifact without mutation affordances.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST keep the existing Issues route thin and place planning UI, hooks, state, and copy inside the Issue Composer feature.
- MUST show named, escaped Human View fields in pt-BR; uncertainties remain visible and nonblocking through read-only approval.
- MUST distinguish saved from dirty/uncertain client state, reconcile lost responses through submission/detail reads, and never claim mutation success optimistically.
- MUST preserve publication identity and conversation access while showing planning as a separate artifact and no downstream route as running.
</requirements>

## Subtasks
- [x] 4.1 Extend feature contracts, copy, reducer state, and reads for planning DTOs and monotonic versions.
- [x] 4.2 Implement start/retry/select/approve actions with tab-scoped pending-command reconciliation.
- [x] 4.3 Add planning stage, lifecycle timeline, Human View, route selector, artifact and source presentation.
- [x] 4.4 Replace published-terminal assumptions while retaining trusted Issue snapshot and independent conversation loading.
- [x] 4.5 Render author and authorized-reader states with controls, finality, recovery, and access loss handled truthfully.
- [x] 4.6 Add 2s/15s visible polling, focus/reconnect refresh, rate-limit handling, and stale-response rejection.
- [x] 4.7 Update product/design documentation and cover state/component/hook behavior using existing web test patterns.

## Implementation Details

Follow TechSpec C09–C12 and workspace behavior, plus `apps/web/AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `nextjs-folder-structure`, and `trpc-nextjs`. Keep all new UI under `src/features/issues/issue-composer/`; preserve existing tokens, accessibility primitives, reduced-motion behavior, and 100-line source-file limits.

### Relevant Files
- `apps/web/src/features/issues/issue-composer/contract.ts` — inferred task API outputs.
- `apps/web/src/features/issues/issue-composer/workspaceState.ts` — selected-task/version/error reducer behavior.
- `apps/web/src/features/issues/issue-composer/hooks/useTaskWorkspace.ts` — reads, navigation, and polling ownership.
- `apps/web/src/features/issues/issue-composer/hooks/taskReads.ts` — detail refresh and conversation isolation.
- `apps/web/src/features/issues/issue-composer/components/AuthorStage.tsx` — published-is-terminal behavior to evolve.
- `apps/web/src/features/issues/issue-composer/components/ReaderStage.tsx` — read-only counterpart.
- `apps/web/src/features/issues/issue-composer/components/PublishedResult.tsx` — retained Issue snapshot and trusted link precedent.
- `apps/web/src/test/` and `apps/web/e2e/task-workspace.spec.ts` — testing fixtures and interaction conventions.

### Dependent Files
- `apps/web/src/features/issues/issue-composer/components/Workspace.tsx` — composes planning, artifacts, and conversation.
- `apps/web/src/features/issues/issue-composer/components/SessionRail.tsx` — lifecycle/current-action surface.
- `apps/web/src/features/issues/issue-composer/components/HistoryEntry.tsx` — compact planning status in history.
- `apps/web/PRODUCT.md` and `apps/web/DESIGN.md` — artifact model and visual guidance need planning continuation.
- `packages/api/src/routers/taskPlanning.ts` — task 02 supplies the typed client contract.

### Related ADRs
- [ADR-002: Keep uncertainties visible without blocking route approval](adrs/adr-002.md) — uncertainty behavior.
- [ADR-003: Separate route selection from final human approval](adrs/adr-003.md) — interaction and read-only finality.
- [ADR-004: Present real planning artifacts and stop at route approval](adrs/adr-004.md) — Human View and scope.
- [ADR-007: Version route review and render typed artifacts](adrs/adr-007.md) — reconciliation and stale UI behavior.

## Deliverables

- Feature-local planning actions, state, polling, timeline, Human View, selector, artifacts, and reader experience.
- Updated product/design documentation consistent with the additional planning artifact.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

- [x] UT-046, UT-047, UT-048, UT-049, UT-050 — action receipts, lost responses, reconciliation, conflicts, and dirty approval blocking.
- [x] UT-051, UT-052, UT-053, UT-054, UT-055, UT-056 — monotonic workspace state, navigation isolation, protected-content clearing, polling, and rate limits.
- [x] UT-057, UT-058, UT-059, UT-060, UT-061 — accessible escaped PlanningDecision Human View and uncertainty display.
- [x] UT-062, UT-063, UT-064, UT-065, UT-066, UT-067 — selector validation, reader state, unknown lifecycle, and truthful timeline.
- [x] UT-068, UT-069, UT-070, UT-071, UT-072 — Issue snapshot/link safety, source truthfulness, artifact and conversation resilience.

### Deferred Gates

- [ ] E2E-001, E2E-002, E2E-003, E2E-004, E2E-005, E2E-006, E2E-007, E2E-008, E2E-009, E2E-010, E2E-011, E2E-012, E2E-013, E2E-014, E2E-015, E2E-016, E2E-017, E2E-018, E2E-021, E2E-022, E2E-023, E2E-025, E2E-026, E2E-027, E2E-029, E2E-030 (`feature-gate`) — run complete local Playwright journeys after feature wiring.
- [ ] E2E-019, E2E-020, E2E-024, E2E-028, E2E-031 (`qa-release`) — staging accessibility, browser matrix, no-downstream, and grounded-rationale evidence.

## Success Criteria

- Every task-required test case implemented and passing.
- The author can approve exactly one reviewed saved route; readers receive equivalent truthful read-only state.
- The UI remains accessible, non-optimistic, scoped to the selected task, and stops visibly at approved planning.
