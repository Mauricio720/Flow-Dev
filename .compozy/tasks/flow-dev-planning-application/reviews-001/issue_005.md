---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: apps/web/src/features/issues/issue-composer/hooks/usePlanningActions.ts
line: 27
severity: medium
author: claude-code
provider_ref:
---

# Issue 005: Draft route survives a failed save and silently disables approval

## Review Comment

`draftRoute` is reset only through the `onSettled` callback, which `usePlanningCommand` invokes exclusively on success. `ReviewControls` closes the selector immediately after `onSave` (`PlanningActions.tsx:26`), so when the save is rejected or conflicts, `draftRoute` keeps the unsaved choice while the selector is no longer visible.

`dirty` (`draftRoute !== decision.selectedRoute`) then remains `true`. After a conflict the author clicks "Revisar a rota salva" (`reviewed` → phase `idle`), but "Aprovar planejamento" stays disabled because `blocked` includes `actions.dirty`, and nothing on screen explains why. The only way out is the non-obvious "Alterar rota" → "Cancelar".

The TechSpec requires that after a conflict the UI refreshes and asks for a new explicit review, with the unsaved choice kept "distinct from the saved route" and visible to the author.

Suggested fix: clear `draftRoute` when the command ends in `conflict`/`rejected` and when `reviewed` is dispatched (e.g. have `usePlanningCommand` call `onSettled` for those outcomes, or wrap `reviewed` in `usePlanningActions`), or keep the selector open with the pending choice until the save is confirmed. Add a hook test: save conflicts → `reviewed()` → `dirty` is `false`.

## Triage

- Decision: `VALID`
- Notes: Valid. `draftRoute` was reset only on success, so a conflicted/rejected save left `dirty` true with the selector closed and approval disabled. Fix: `usePlanningCommand` calls `onSettled` (which clears `draftRoute`) for conflict/rejected outcomes and when `reviewed` is dispatched. Test: save conflicts, `reviewed()`, `dirty` is false and approval unblocked.
