---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: packages/api/src/controllers/planningEvents.ts
line: 3
severity: low
author: claude-code
provider_ref:
---

# Issue 010: Planning events miss the replay event and several specified fields

## Review Comment

The Monitoring section of the TechSpec lists `planning.command_replayed` among the required events and asks for fields including safe reason, queue age, elapsed milliseconds and request correlation.

- `TaskPlanningController` logs `planning.accepted`, `planning.route_saved` or `planning.approved` for every returned receipt, including same-key replays, because the DAO does not tell the controller whether the receipt was replayed. `planning.command_replayed` is never emitted, so accepted/approved counts derived from logs are inflated by retries.
- `logPlanningWorkerEvent` omits queue age and elapsed milliseconds, which the operator thresholds in the same section ("oldest eligible queued item above 60 seconds", observed latency versus budgets) depend on.

Suggested fix: have the planning DAO commands return a `replayed` flag alongside the receipt (kept out of the API DTO) and log `planning.command_replayed` in that case; add `queueAgeMs` at claim time (`now - operation.createdAt`) and `elapsedMs` at settlement to the worker events.

## Triage

- Decision: `VALID`
- Notes: Valid. Fix: DAO commands return `PlanningCommandResult` (receipt plus `replayed`), true for same-key replays; `finishPlanningCommand` strips the flag from the API receipt and logs `planning.command_replayed` instead of the accepted/saved/approved event. Worker events now include `queueAgeMs` at claim and `elapsedMs` at settlement. Test: controller logs `planning.command_replayed` and returns a receipt without the flag. Touched the DAO contract and its Drizzle implementations (planningStart.ts, planningReviewCommands.ts) outside the listed file.
