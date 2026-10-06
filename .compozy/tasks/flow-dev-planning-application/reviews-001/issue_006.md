---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: apps/web/src/features/issues/issue-composer/components/PlanningActions.tsx
line: 42
severity: medium
author: claude-code
provider_ref:
---

# Issue 006: Awaiting-planning state misses the specified CTA, explanation and reason

## Review Comment

US-001 AC-2 and PRD Core Feature 1 require that a published Issue without analysis shows the action “Analisar próxima etapa” together with an explanation that Dev Control can recommend the next development step. US-001 EC-2 requires that when the publication link or confirmed Issue identity is missing, "the workspace explains that a confirmed publication is required".

Current behavior:

- the button is labeled "Iniciar planejamento" (and `currentAction` says "Iniciar o planejamento"); the label “Analisar próxima etapa” does not exist anywhere in `apps/web`;
- no explanatory text about Dev Control recommending the next step is rendered in the `awaiting` state;
- `planning.eligibility.reason` is never rendered. `planningModel.ts:40` only uses `eligibility.canStart` to hide the "Próxima ação" line, so an ineligible task (`publication_required` or `planning_input_limit`) shows a disabled button with no explanation, although `PLANNING_REASON_MESSAGE` already has copy for both reasons.

The deferred E2E gates locate controls by accessible name, so the label mismatch will also surface there.

Suggested fix: rename the action to “Analisar próxima etapa”, add a short awaiting-state explanation in `planningCopy.ts`, and when `eligibility.canStart` is false render `reasonMessage(eligibility.reason)` next to the disabled action. Update `PlanningStage.test.tsx` accordingly.

## Triage

- Decision: `VALID`
- Notes: Valid. The action was labeled 'Iniciar planejamento', no awaiting explanation existed and `eligibility.reason` was never rendered. Fix: action renamed to 'Analisar próxima etapa' (`START_ACTION_LABEL`, `currentAction`, timeline), `AWAITING_EXPLANATION` added to `planningCopy.ts`, and `PlanningStage` renders the explanation plus `reasonMessage(eligibility.reason)` when `canStart` is false. Tests added in `PlanningStage.test.tsx` for the CTA, explanation and ineligible reason.
