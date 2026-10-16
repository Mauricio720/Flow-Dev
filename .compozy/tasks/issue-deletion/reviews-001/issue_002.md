---
provider: manual
pr:
round: 1
round_created_at: 2026-10-14T17:57:38Z
status: resolved
file: packages/api/src/application/services/issue-deletion/issueDeletionService.ts
line: 160
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Queue deletion can complete before a claimed task is attached

## Review Comment

The queue deletion operation is committed by `reserve` before `taskForIdentity` looks for an already-claimed task and `attachTask` records it. The worker can claim the newly visible operation in that gap; because `operation.taskId` is still null, `stopStage` treats it as queue-only, and the worker may delete the GitHub issue and mark the operation complete through `completeQueueOnly`. The claimed Flow Dev task then remains in the database after the UI reports deletion success. Resolve the task identity and attach it within the same transaction and identity lock that reserves the queue operation, or otherwise prevent the worker from claiming the operation until attachment is complete.

## Triage

- Decision: `VALID`
- Root cause: queue reservation commits before the service performs a separate identity lookup and `attachTask`, so a worker can claim and complete the operation with a null task ID.
- Fix: resolve the task identity and attach it to the queue operation inside the reservation transaction while holding the same identity lock used by queue claims.
- Scope: `batch_scope.md` is absent; the issue frontmatter identifies `issueDeletionService.ts`. The fix also requires the DAO reservation implementation and a focused regression test because attachment must be atomic with reservation.
- Resolution: queue reservation now resolves and attaches a matching task before its identity-lock transaction commits; the worker receives the attached task ID before it can claim the operation. Verified by `IT-054` and complete API unit/integration suites.
