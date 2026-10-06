---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: apps/web/src/features/issues/issue-composer/taskFailure.ts
line: 49
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Definitive planning rejections are shown as an unconfirmed submission

## Review Comment

`isUnconfirmed` treats every `INTERNAL_SERVER_ERROR` as "the response was lost". `usePlanningCommand.fail` (`hooks/usePlanningCommand.ts:28`) relies on it, but the planning error contract deliberately returns `INTERNAL_SERVER_ERROR` for definitive, pre-acceptance rejections that carry a safe reason: `planning_unconfigured` (start/retry, checked *before* enqueue) and `invalid_stored_content`.

Result when `PLANNING_BASE_URL`/`PLANNING_API_KEY` are absent (the TechSpec's documented lever to "disable new starts through configuration"):

- the author clicks start, the server answers `planning_unconfigured`, and the UI enters `uncertain` with "Não recebemos a confirmação da última ação";
- "Verificar envio" returns `not_accepted`, the UI moves to `resend`, and "Reenviar a mesma ação" repeats the same rejection in a loop;
- the pending command stays in session storage, and the dedicated copy `PLANNING_REASON_MESSAGE.planning_unconfigured` ("O Dev Control não está configurado neste ambiente. Nenhuma análise foi iniciada.") is never displayed for this path.

The UI therefore tells the author the outcome is unknown when the server has stated precisely that nothing was accepted, which contradicts the PRD rule "Tell the user what was accepted or saved".

Suggested fix: for planning commands, treat a failure as unconfirmed only when there is no code (network) or the code is `INTERNAL_SERVER_ERROR` with reason `service_unavailable`/absent. A failure with a known definitive reason must dispatch `rejected` and clear the pending command. Keep the existing behavior for the authoring flow if it depends on it (introduce a planning-specific predicate rather than changing `isUnconfirmed` globally). Add a hook test: start rejected with `{ code: "INTERNAL_SERVER_ERROR", reason: "planning_unconfigured" }` ends in `rejected` and shows the reason message.

## Triage

- Decision: `VALID`
- Notes: Valid. `isUnconfirmed` treats every `INTERNAL_SERVER_ERROR` as a lost response, but `planning_unconfigured` and `invalid_stored_content` are definitive pre-acceptance rejections. Fix: new planning-specific predicate `isPlanningUnconfirmed` in `taskFailure.ts` (no code, or INTERNAL with no reason / `service_unavailable`); `usePlanningCommand.fail` uses it, so definitive reasons dispatch `rejected` and show their copy. `isUnconfirmed` is unchanged for the authoring flow. Test: start rejected with `planning_unconfigured` ends in `rejected` and clears the pending command.
