---
status: completed
title: Real, accessible task workspace
type: frontend
complexity: high
---

# Task 05: Real, accessible task workspace

## Overview
Replace the simulated issue workspace with the real persisted task journey. This slice presents history, conversation, evidence, canonical review, recovery and publication as an accessible Portuguese interface for both authors and read-only project members.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST replace demo sessions, fabricated activity, timers and publication numbers with confirmed task API state.
- MUST retain unsent text until command acceptance is confirmed and preserve local review edits on failed saves.
- MUST expose canonical draft fields, source provenance, proposal selection, preview, publication recovery and author/read-only states.
- MUST provide MediaRecorder capture with explicit Start, Stop, Cancel and manual Send through the dictation service.
- MUST make history, sources, actions, state feedback and mobile layouts accessible with keyboard, focus management and live announcements.
</requirements>

## Subtasks
- [x] 5.1 Replace workspace demo state with task loaders, actions, polling and safe route state.
- [x] 5.2 Implement durable history, task deep links and author/read-only presentation.
- [x] 5.3 Present canonical draft editing, refinement selection, preview and publication recovery.
- [x] 5.4 Present actual source activity and provenance with an accessible mobile alternative.
- [x] 5.5 Integrate MediaRecorder capture, token preflight, transcript review and cleanup fencing.
- [x] 5.6 Add accessible error, loading, empty and status behavior across desktop and mobile.
- [x] 5.7 Remove the issue-composer's runtime dependency on fabricated demo sessions.

## Implementation Details
Keep App Router entries thin and extend the feature-first issue composer. Read the current Next.js guides in the installed `apps/web/node_modules/next/dist/docs/` before editing frontend code. Use the existing tRPC client/server caller and do not add a parallel browser data layer.

### Relevant Files
- `apps/web/src/app/projects/[projectId]/issues/page.tsx` — thin selected-project route entry.
- `apps/web/src/features/issues/issue-composer/hooks/useWorkspace.ts` — current scripted workspace to replace.
- `apps/web/src/features/issues/issue-composer/model.ts` — prototype draft model conflicts with the canonical contract.
- `apps/web/src/features/issues/issue-composer/components/Workspace.tsx` — composition and author/read-only presentation.
- `apps/web/src/features/issues/issue-composer/components/Composer.tsx` — recoverable input and dictation controls.
- `apps/web/src/features/issues/issue-composer/components/SourcesPanel.tsx` — provenance presentation and mobile access gap.
- `apps/web/src/lib/navigation/projectRoutes.ts` — project and OAuth return path ownership.

### Dependent Files
- `apps/web/src/features/issues/issue-composer/components/` — history, thread, draft, source and publishing components.
- `apps/web/src/features/issues/issue-composer/hooks/` — task loader, actions, polling and dictation state.
- `apps/web/src/features/issues/issue-composer/server/` — server-side task workspace loader.
- `apps/web/src/app/projects/[projectId]/issues/` — route entries and optional task deep-link route.
- `apps/web/e2e/` — isolated Playwright journeys using accessible locators.

### Related ADRs
- [ADR-002: Share task history while reserving changes to the author](adrs/adr-002.md) — reader mode and author controls.
- [ADR-003: Provide editable dictation on desktop and mobile](adrs/adr-003.md) — capture controls and final editable transcript.
- [ADR-005: Use Groq Whisper V3 Turbo for reviewed dictation](adrs/adr-005.md) — remote-processing disclosure and final-only transcript.
- [ADR-008: Dispatch publication once and preserve unresolved uncertainty](adrs/adr-008.md) — blocked uncertain-publication UI.

## Deliverables
- Feature-first workspace wired to persisted task APIs without fake activity or publication output.
- Accessible author and reader journeys including MediaRecorder capture and canonical review.
- Independent component and Playwright coverage using dedicated non-production fixtures.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-047, UT-048, UT-049, UT-050, UT-051, UT-052, UT-053, UT-054, UT-055, UT-056 — task loader, history, confirmed input, draft and actual activity display.
- [x] UT-057, UT-058, UT-059, UT-060, UT-061, UT-062 — dictation append/error, task navigation and reader access presentation.
- [x] UT-101, UT-103, UT-104, UT-109, UT-110 — history bounds, capture interruption, pending proposal and restored-state behavior.
- [x] UT-111, UT-112, UT-113, UT-114, UT-115, UT-116, UT-117, UT-118, UT-119, UT-120 — microphone failure, limit, cancellation and cross-task lifecycle.
- [x] UT-121, UT-122, UT-123, UT-124, UT-125, UT-126, UT-127, UT-128, UT-129, UT-130 — editable final text, no-speech and Send fencing.
- [x] UT-131, UT-132, UT-133, UT-134, UT-135, UT-136, UT-137, UT-138, UT-139, UT-140, UT-141, UT-142, UT-143, UT-144, UT-145, UT-146 — stale UI responses, provenance, review saving, publication state and accessibility.

### Deferred Gates

- [ ] E2E-004 through E2E-019 (`feature-gate`) — isolated complete user journeys after all dependencies are integrated.
- [ ] E2E-001, E2E-002, E2E-003, E2E-025, E2E-027 (`qa-release`) — responsive, accessibility and scale release checks.

## Success Criteria
- Every task-required test case implemented and passing.
- Reloading, switching tasks or losing an operation response never fabricates saved work or loses confirmed state.
- Authors can complete the reviewed task journey while readers remain visibly and functionally read-only.

## Execution Notes

Verified on 2026-10-02: `pnpm --dir apps/web test` 127 passed, `pnpm --dir packages/api test` 112 passed, `pnpm typecheck`, `pnpm lint` and `pnpm build` clean; `pnpm --dir apps/web test:e2e` (chromium, throwaway database) 12 passed with the 16 feature-gate journeys recorded as `test.fixme`.

Resolved interpretations (contract precedence applied, no question raised):

- The task deep-link route `/projects/[projectId]/issues/[taskId]` is required, not optional (TechSpec "Frontend state" and UT-059 outrank the paraphrase above).
- UT-059 and UT-060 live with `normalizeDestination` in `packages/api/src/application/auth/destination.ts`.
- Dictation never shows a partial transcript; an interrupted capture ends as `incomplete_capture` (TechSpec, `_tests.md` audit and ADR-005 outrank the US-005 wording).
- Readers get no mutation control mounted and a visible read-only explanation naming the author (UT-061 and UT-142 together).
- Tool activity is shown when the generation result arrives through polling, never as simulated live rows (ADR-007).

Work outside the frontend that this task needed:

- `tasks.byId` and `tasks.list` gained additive read-only fields: `authorName`, `activity` and the publication snapshot (`title`, `bodyMarkdown`, `repository`). History search also matches the author name.
- `tasks.start` and `tasks.send` failed on a real database with a foreign-key violation (operation inserted before its message); the two inserts were reordered. Found by driving the live page, not by the unit suites.

Follow-ups for the pending dependency tasks:

- `tasks.preview`, `tasks.publish` and `tasks.reconcilePublication` are not registered (task_03). The workspace calls preview/publish through `publicationClient.ts`, which is typed by hand from the TechSpec and reports "publicação não disponível" until they exist; replace that file with inferred types once they are registered. Reconciliation is not wired because no attempt id is exposed; "Verificar agora" only rereads the task.
- Every task read calls GitHub through `RepositoryAccessService.requireRead`. With the 2-second polling of a pending task this spends the provider rate limit quickly (the unauthenticated 60/hour allowance ran out during local verification). Needs caching or a cheaper check before the browser-journey gate.
- Adding a source to the draft from existing task evidence is not offered; sources can be edited and removed.
- E2E-004 through E2E-019 are recorded as `test.fixme` in `apps/web/e2e/task-workspace.spec.ts`; they need controlled GitHub, Issue Author and Groq servers.
