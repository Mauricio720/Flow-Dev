import { PERMISSION_DECISIONS, type PermissionDecision } from "../../terminal/sessionInteraction";
import { MAX_FREE_TEXT_LENGTH } from "./sessionInteractionLimits";

export type PermissionDecisionInput = { decision: PermissionDecision; reason?: string; suggestedRule: string | null; offers: PermissionDecision[]; alwaysScope?: "project" | "machine" | null };
export type PermissionDecisionResult = { ok: true } | { ok: false; reason: "answer_invalid" | "decision_not_offered" };

const INVALID: PermissionDecisionResult = { ok: false, reason: "answer_invalid" };

export function validatePermissionDecision(input: PermissionDecisionInput): PermissionDecisionResult {
  if (!PERMISSION_DECISIONS.includes(input.decision)) return INVALID;
  if (!input.offers.includes(input.decision)) return { ok: false, reason: "decision_not_offered" };
  if (input.decision === "allow_always" && (!input.suggestedRule || !input.alwaysScope)) return INVALID;
  if ((input.reason ?? "").length > MAX_FREE_TEXT_LENGTH) return INVALID;
  return { ok: true };
}
