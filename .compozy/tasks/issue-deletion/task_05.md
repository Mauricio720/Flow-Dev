---
status: completed
title: Deletion experience
type: frontend
complexity: high
---

# Task 05: Deletion experience

## Overview

Add one consistent deletion interaction to saved authoring issues, claimed assigned work, and unclaimed Ready queue Issues. The interface must show the exact issue and destinations, require explicit confirmation, report persisted progress or recoverable failure truthfully, and navigate safely after confirmed completion.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. The shared feature MUST show “Excluir issue” only where the server reports current deletion capability; saved authoring, claimed work, and Ready queue entry points MUST use the same preview/status contract.
- 2. The confirmation MUST identify title, repository, and Issue number when present; name Flow Dev and GitHub destinations accurately; warn of permanence and active-work interruption; and state that worktrees, branches, and PRs remain even when none are known.
- 3. Cancel and Escape MUST cause no mutation or stop; opening MUST move focus into the dialog and cancel MUST restore focus to the trigger.
- 4. Confirmation MUST send a UUID request key and preview fingerprint, show a textual pending state, poll persisted status with a bound, and avoid duplicate competing submissions.
- 5. Recoverable status MUST distinguish GitHub refused, unavailable, and unknown where evidence allows, show work-stopped and remote-presence truthfully, and provide a safe retry without raw provider details or local paths.
- 6. Confirmed completion MUST refresh relevant history/assigned/Ready views, navigate to a safe project list or empty state, and make stale direct detail routes unavailable without removed content.
- 7. The feature MUST use Portuguese copy, keyboard/screen-reader accessible controls and live status text, responsive layout, existing design tokens, and inferred tRPC types.
</requirements>

## Subtasks

- [x] 05.1 Define a shared issue-deletion feature boundary and typed client contract for task and queue targets.
- [x] 05.2 Add eligible triggers to saved issue authoring, claimed-work detail, and Ready queue rows.
- [x] 05.3 Implement exact-target confirmation with permanence, destinations, interruption, and preserved-artifact copy.
- [x] 05.4 Implement focus management, cancel behavior, accessible pending announcements, and narrow-screen layout.
- [x] 05.5 Implement start/status/retry interaction with bounded polling, idempotent keys, and safe recoverable messages.
- [x] 05.6 Refresh lists and direct detail views, navigate after confirmed success, and show an unavailable state for stale URLs.
- [x] 05.7 Implement the assigned component tests and run affected web checks.

## Implementation Details

Follow `_techspec.md` “Web integration.” Read `apps/web/AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `.agents/rules/e2e-testing.md`, and the relevant installed Next.js 16 guide under `apps/web/node_modules/next/dist/docs/` before writing app code. Keep route entries thin; place the shared flow in `apps/web/src/features/issues/issue-deletion/` and compose it into sibling surfaces through props without sibling-feature imports. Reuse current server/client tRPC helpers and request-key conventions.

PRD/story coverage: US-001 through US-007 across the three entry points, confirmation, active-work status, permission, recovery, and artifact copy.

### Relevant Files

- `apps/web/src/features/issues/issue-composer/components/{TaskStage,Workspace,WorkspaceNotices}.tsx` — saved-task action and stale-route messaging.
- `apps/web/src/features/issues/assigned-work/components/{WorkDetail,WorkHeader,ReadyQueue,QueueRow,WorkAccessNotice}.tsx` — claimed and Ready entry points.
- `apps/web/src/features/issues/assigned-work/hooks/{useWorkQueue,useWorkDetail}.ts`, `apps/web/src/features/issues/assigned-work/queueState.ts`, and `apps/web/src/features/issues/issue-composer/hooks/useTaskWorkspace.ts` — refresh and polling ownership.
- `apps/web/src/lib/trpc/{client,server}.ts` and `apps/web/src/lib/tasks/requestKeys.ts` — existing typed transport and idempotency conventions.
- `apps/web/src/lib/navigation/projectRoutes.ts` — safe project issue/work destinations.
- `apps/web/src/features/software/compozy/components/LoginDialog.tsx` — existing dialog/focus primitive pattern.

### Dependent Files

- `apps/web/src/features/issues/issue-deletion/` — new confirmation/action/status components, focused hook, and safe copy mapper.
- `apps/web/src/features/issues/issue-composer/components/{TaskStage,Workspace,WorkspaceNotices}.tsx` — action and unavailable state.
- `apps/web/src/features/issues/assigned-work/components/{WorkDetail,WorkHeader,ReadyQueue,QueueRow}.tsx` — claimed and Ready integrations.
- `apps/web/src/features/issues/{issue-composer,assigned-work}/contract.ts` — inferred API output integration where needed.
- `apps/web/src/features/issues/issue-deletion/` component tests and existing issue-composer/assigned-work component tests — focus, copy, and integration behavior.
- `apps/web/e2e/{task-workspace,work-workspace}.spec.ts` — focused feature/release gates, planned below.

### Related ADRs

- [ADR-001: Delete linked issues from Flow Dev and GitHub](adrs/adr-001.md) — confirmation destinations and success semantics.
- [ADR-002: Stop active issue work during deletion](adrs/adr-002.md) — visible stopping state.
- [ADR-003: Require local authority and confirmed GitHub deletion](adrs/adr-003.md) — capability and denial copy.
- [ADR-004: Preserve code artifacts associated with a deleted issue](adrs/adr-004.md) — explicit preserved-artifact copy.
- [ADR-005: Persist one deletion operation per immutable issue identity](adrs/adr-005.md) — status and retry continuity.
- [ADR-006: Prove GitHub absence before local issue cleanup](adrs/adr-006.md) — no optimistic completion.

## Deliverables

- Reusable Portuguese deletion flow integrated with authoring, claimed work, and Ready queue, with accessible confirmation and truthful status/retry.
- Safe post-success navigation, list refresh, and stale-detail unavailable state.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-021 — preserved worktree/branch/PR copy with absent or malformed artifact references and no path leak.
- [x] UT-022 — dialog focus, Escape/cancel focus return, and no start mutation.
- [x] UT-023 — empty or credential-bearing provider failure maps to safe Portuguese copy.

### Deferred Gates

- [ ] E2E-001 (`feature-gate`) — saved draft cancel, confirm, history, and stale route.
- [ ] E2E-002 (`feature-gate`) — published Issue progress and second-tab convergence.
- [ ] E2E-003 (`feature-gate`) — Ready queue deletion and pagination.
- [ ] E2E-005 (`feature-gate`) — refusal, retry, and truthful completion.
- [ ] E2E-006 (`feature-gate`) — unauthorized control and direct mutation protection.
- [ ] E2E-004 (`qa-release`) — isolated local execution stop and preserved worktree.
- [ ] E2E-007 (`qa-release`) — keyboard, screen reader, narrow viewport, cancel, and safe navigation.

Run the focused Playwright commands at the feature or release trigger specified in `_tasks.md`.

## Success Criteria

- Every task-required test case implemented and passing.
- Cancel never changes server state, and completion appears only after persisted confirmation.
- All three entry points present current capability, recovery, and safe navigation without leaking private paths or raw provider text.
