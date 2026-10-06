---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: packages/api/src/application/services/tasks/planningRules.ts
line: 15
severity: low
author: claude-code
provider_ref:
---

# Issue 012: Assessment limits are duplicated as literals; limit constants unused

## Review Comment

`planningLimits.ts` exports `PLANNING_SUMMARY_MAX_CODE_POINTS`, `PLANNING_REASON_MAX_CODE_POINTS`, `PLANNING_REASONS_MAX` and `PLANNING_UNCERTAINTIES_MAX`, but `parsePlanningAssessment` and `validTexts` hardcode `4_000`, `1, 20`, `0, 20` and `2_000`, and the complexity values are repeated as `["low", "medium", "high"]` although `planningComplexities` exists in `planningContracts.ts` (same for `isRoute` versus `planningRoutes`).

The four constants are dead exports, the limits live in two places that can drift, and the literals violate the project's "Magic Numbers and Strings" rule in `.agents/rules/code-standards.md`.

Suggested fix: use the constants from `planningLimits.ts` and the enum arrays from `planningContracts.ts` inside `parsePlanningAssessment`, `validTexts` and `isRoute`.

## Triage

- Decision: `VALID`
- Notes: Valid. Fix: `parsePlanningAssessment`/`validTexts`/`isRoute` now use the constants from `planningLimits.ts` and the `planningRoutes`/`planningComplexities` arrays from `planningContracts.ts`; minimum counts extracted to named constants.
