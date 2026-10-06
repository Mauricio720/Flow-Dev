---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: apps/web/src/features/issues/issue-composer/hooks/usePlanningCommand.ts
line: 22
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Rejected or conflicted planning commands stay in session storage

## Review Comment

`run` calls `savePending(pending)` before dispatching, but `clearPending` is only called in `settle` (success). In `fail`, the `conflict` and `rejected` branches drop the command from reducer state without removing it from session storage.

After any definitive rejection (`planning_conflict`, `planning_capacity`, `planning_exists`, `author_required`, …) a reload or navigating back to the task runs `restore`, which finds the stale entry, forces `begin` + `unconfirmed`, queries `submission`, gets `not_accepted`, and lands in `resend`. The author then sees "Não recebemos a confirmação da última ação" with a "Reenviar a mesma ação" button for a command the server already rejected, and "Aprovar planejamento" is disabled (`blocksApproval` includes `resend`) with no way to dismiss the state other than resending. For a stale `planning.approve`, the only offered exit is to re-send an approval without telling the author which action it is.

This contradicts the TechSpec: pending metadata is held "until its outcome is known", and after a conflict the UI must "require a new explicit review action", not offer a resend of the old command.

Suggested fix: call `clearPending(pending.taskId)` whenever the outcome is known, i.e. in the `conflict` and `rejected` branches (keep it only for `unconfirmed`). Extend `usePlanningActions.test.tsx` to assert session storage is empty after a rejected and after a conflicted command.

## Triage

- Decision: `VALID`
- Notes: Valid. `clearPending` only ran on success, so conflict/rejected left a stale command that `restore` turned into a bogus resend after reload. Fix: `usePlanningCommand.fail` now clears the stored pending command for every known outcome (conflict and rejected) and keeps it only for unconfirmed. Tests: pending storage is empty after a rejected and after a conflicted command, and kept after a lost response.
