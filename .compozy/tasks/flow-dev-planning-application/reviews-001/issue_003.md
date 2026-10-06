---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: packages/api/src/infra/database/dao/tasks/planningWorkerClaim.ts
line: 24
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Planning sweep locks operation before task, inverting settlement order

## Review Comment

`sweepPlanning` selects expired operations `FOR UPDATE SKIP LOCKED` on `task_operations` only, and `failExpired` then updates the owning `tasks` row. Every other planning writer takes the locks in the opposite order: `lockCurrent` in `planningWorkerSettlement.ts:37-39` locks the task `FOR UPDATE` first and the operation second, and the TechSpec states that claim must work "under task-then-operation locks".

Deadlock scenario: an operation is `running` and becomes sweepable (15-minute deadline reached, or third dispatch with an expired lease). Its worker returns and calls `completePlanning`/`failPlanning`, which locks the task and then waits for the operation row. Concurrently the other worker slot runs `claimPlanning`, whose sweep already holds the operation row and now waits for the task row. PostgreSQL aborts one transaction with `40P01`.

If the aborted transaction is the claim, the error propagates out of `TaskPlanningWorkerController.tick` → `TaskWorkerController.run`, which has no error handling, so `runPool` rejects and the whole `tasks:worker` process exits, also interrupting generation and publication work.

Suggested fix: in the sweep, lock in task-then-operation order (select candidate IDs without locking, then for each lock the task `FOR UPDATE SKIP LOCKED` followed by the operation, re-checking the expiry predicate), or join `tasks` and use `.for("update", { of: [tasks, taskOperations], skipLocked: true })` as the main claim query already does. Add an integration case where a late settlement races the deadline sweep.

## Triage

- Decision: `VALID`
- Notes: Valid. `sweepPlanning` locked `task_operations` first while every settlement locks task then operation. Fix: the sweep now selects from `tasks` joined to `task_operations` with `FOR UPDATE OF tasks, task_operations SKIP LOCKED`, the same shape as the main claim query, with the batch size extracted to a constant. Test: `planning-sweep-race.test.ts` (IT-092) races a late `complete` against a claim whose sweep targets the same operation and asserts no `40P01`. A deadlock is timing dependent, so this test is a regression guard rather than a deterministic reproduction.
- Files: planningWorkerClaim.ts (+ new integration test).
