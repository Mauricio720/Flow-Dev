---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: packages/api/test/planning-commands.test.ts
line: 60
severity: medium
author: claude-code
provider_ref:
---

# Issue 009: Task 02 marks IT-011 and UT-021 complete but neither test exists

## Review Comment

`task_02.md` checks off `IT-011` and `UT-021` in its `## Tests` section, but no planning test carries either ID (the only `IT-011`/`UT-021` matches in the repository belong to the publication, draft-rules and repository-authorization suites of other features).

- **IT-011** (`_tests.md:294`): "given 99 global active plans and two concurrent authors starting eligible tasks, only one is accepted; the active count is 100." Only the per-author limit is covered (`IT-010`). The global cap of 100 and, more importantly, the serialization provided by `pg_advisory_xact_lock` in `planningStart.ts:37` have no test, so removing or misplacing the advisory lock would go unnoticed.
- **UT-021** (`_tests.md:218`): "PlanningService.selectRoute — given the current route `tech_spec` and matching versions, returns the current selection version without a decision mutation." The integration case `IT-036` covers the persisted outcome, but the contracted unit case is absent.

Suggested fix: add `IT-011` to `planning-commands.test.ts` (seed 99 active plan operations across authors, fire two concurrent `planning.start` calls from different authors with `Promise.allSettled`, assert exactly one fulfillment, one `planning_capacity` rejection, and 100 active rows). Add `UT-021` next to the other service/controller unit cases, or, if the behavior is intentionally covered only at integration level, update `_tests.md`/`task_02.md` to say so instead of marking the ID as implemented.

## Triage

- Decision: `VALID`
- Notes: Valid. IT-011 was missing and UT-021 was marked done without a test. Fix: `planning-admission.test.ts` (IT-011) seeds 99 active plans across 20 authors and fires two concurrent starts from different authors: exactly one is accepted, the other gets `planning_capacity`, and 100 active rows remain. A mutation check removing the advisory lock made it fail (race dependent, 1 of 3 runs). UT-021 is covered at integration level by IT-036 (`planning-review.test.ts`), because `PlanningService.selectRoute` only delegates to the DAO, so a service unit test would assert nothing; `task_02.md` was updated to say so instead of claiming a UT-021 test. This touches task_02.md and planning-support.ts (helper params) outside the code list, minimally.
