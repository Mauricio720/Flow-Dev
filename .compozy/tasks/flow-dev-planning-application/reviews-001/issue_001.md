---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: packages/api/src/controllers/planningWorkerOutcome.ts
line: 15
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Unclassified planning worker errors are abandoned without any log

## Review Comment

`classifyPlanningError` returns `{ kind: "abandon" }` whenever `planningReason` yields `null`, and `TaskPlanningWorkerController.settleError` then only emits `planning.stale_result` with no reason and no error detail. `planningReason` yields `null` for every error that is not a `planning_*` TaskError, an access error, or a repository error. That includes:

- `TaskError("invalid_stored_content")` thrown by `readPlanningInput` (missing publication fields **or an `inputHash` mismatch against the stored operation hash**, `planningWorkerInput.ts:23-25`);
- any database/driver error from `claims.input`, `claims.sessionActive` or `claims.complete`;
- any programming error (TypeError, etc.).

Consequences:

1. The original error is never logged anywhere, so the failure cannot be diagnosed. The only trace is a `planning.stale_result` line, which is misleading because the claim is not stale.
2. The operation stays `running` until the 60s lease expires, is reclaimed, fails the same way, and after three dispatches the sweep fails it as `planning_provider_unavailable`. A deterministic integrity failure (hash mismatch, corrupt snapshot) is therefore reported to the author minutes later as "O Dev Control está indisponível", and Dev Control was never called.
3. `PlanningDomainError` is always mapped to `planning_input_limit`, even when its reason is `publication_required`.

The TechSpec requires "log failures separately without asserting an unsaved outcome" and says invalid/corrupt input must fail immediately rather than consume the recovery budget.

Suggested fix: keep `abandon` only for `stale_execution`. Map `invalid_stored_content` and `PlanningDomainError` (using its own `reason`) to an immediate terminal `fail` with a safe reason; for genuinely unknown errors, log the error (name/message, never payloads) through `logPlanningWorkerEvent`/`console.error` before leaving the operation recoverable. Add unit cases to `taskPlanningWorkerController.test.ts` for a non-TaskError thrown by `input` and for `invalid_stored_content`.

## Triage

- Decision: `VALID`
- Notes: Valid. `planningReason` returned null for `invalid_stored_content`, `PlanningDomainError` was always mapped to `planning_input_limit`, and unknown errors were abandoned with a misleading `planning.stale_result` and no detail. Fix: `classifyPlanningError` now abandons silently only for `stale_execution` (`stale: true`), fails `invalid_stored_content` and `PlanningDomainError` immediately with their own reason, and unknown errors are abandoned as `stale: false`; the worker controller logs `planning.unclassified_error` with the error name only (never message/payload) and leaves the operation recoverable. Tests: `planningWorkerOutcome.test.ts` and two new cases in `taskPlanningWorkerController.test.ts`.
- Files: planningWorkerOutcome.ts, taskPlanningWorkerController.ts, planningWorkerEvents.ts (+ tests).
