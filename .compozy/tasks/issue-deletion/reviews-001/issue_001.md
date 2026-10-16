---
provider: manual
pr:
round: 1
round_created_at: 2026-10-14T17:57:38Z
status: resolved
file: packages/api/src/application/services/issue-deletion/issueDeletionService.ts
line: 165
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Linked deletion can stop work before GitHub authorization

## Review Comment

For Flow Dev-origin tasks, `previewTask` and `localAuthority` authorize deletion using only the Flow Dev author/admin role. `startTask` then reserves the deletion and fences the task before the worker checks the initiator's GitHub token and `viewerCanDelete`. The imported-task admin path also skips the GitHub check. If a linked issue's initiator lacks GitHub authorization or deletion permission, the worker discovers that only after it has stopped active work, leaving the issue retained but its work interrupted. The TechSpec requires current user-scoped GitHub authorization and permission checks as part of preview and again before the fence. For linked targets, verify the initiator's current GitHub identity and inspect the frozen issue before advertising `canDelete` or reserving the operation; keep the mutation-time permission check as the final authority.

## Triage

- Decision: `VALID`
- Root cause: linked Flow Dev tasks use only Flow Dev author/admin authority, while imported-task admins bypass GitHub authorization and `viewerCanDelete`; GitHub refusal is discovered after the worker fences active work.
- Fix: evaluate local author/admin authority separately, then require the initiating user's current GitHub context and inspect the frozen linked Issue during preview and immediately before reservation. Keep the worker's mutation-time authorization check as final authority.
- Scope: `batch_scope.md` is absent; the issue frontmatter identifies `issueDeletionService.ts`. Add focused service tests only to cover the fix.
- Resolution: implemented in `IssueDeletionService`; local authorization cannot reserve a frozen linked target without matching current GitHub identity and `viewerCanDelete`. Missing-node published tasks retain their existing recoverable path because no frozen GitHub target exists yet. Verified by API typecheck and complete unit/integration suites.
