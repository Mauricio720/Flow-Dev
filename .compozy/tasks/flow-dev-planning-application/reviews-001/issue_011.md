---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: apps/web/src/features/issues/issue-composer/planningClient.ts
line: 11
severity: low
author: claude-code
provider_ref:
---

# Issue 011: Planning client substitutes a default route for a missing one

## Review Comment

`dispatchPlanning` builds the select/approve payload with `command.route ?? "tech_spec"`, `command.decisionId ?? ""` and `command.expectedDecisionVersion ?? 0`. `PendingCommand` models these as optional for all actions, and `loadPending` (`planningPendingStore.ts:23`) restores a command from session storage after validating only `taskId` and `requestKey`.

A restored or malformed command without `route` would therefore be sent as an approval or selection of `tech_spec`. The server's exact-review guard would normally reject it, but if `tech_spec` happens to be the saved route with matching versions it is accepted. The PRD is explicit that a default route must never be substituted silently, and the fallback also hides programming errors.

Suggested fix: model `PendingCommand` as a discriminated union by `action` so `route`, `decisionId` and `expectedDecisionVersion` are required for review actions and `failedOperationId` for retry; validate that shape in `loadPending` (discard invalid entries); remove the `??` fallbacks from `dispatchPlanning`.

## Triage

- Decision: `VALID`
- Notes: Valid. `PendingCommand` modeled review fields as optional and `dispatchPlanning` substituted defaults. Fix: `PendingCommand` is a discriminated union by `action` (`UnkeyedCommand` for the keyless form), `dispatchPlanning` has no `??` fallbacks, and `loadPending` validates the exact shape per action and discards invalid entries. Tests: `planningPendingStore.test.ts`.
