import { PERMISSION_DECISIONS, type PermissionDecision } from "../../terminal/sessionInteraction";
import { MAX_FREE_TEXT_LENGTH } from "./sessionInteractionLimits";

export type PermissionDecisionInput = { decision: PermissionDecision; reason?: string; suggestedRule: string | null };
export type PermissionDecisionResult = { ok: true } | { ok: false; reason: "answer_invalid" };

const INVALID: PermissionDecisionResult = { ok: false, reason: "answer_invalid" };

export function validatePermissionDecision(input: PermissionDecisionInput): PermissionDecisionResult {
  if (!PERMISSION_DECISIONS.includes(input.decision)) return INVALID;
  if (input.decision === "allow_always" && !input.suggestedRule) return INVALID;
  if ((input.reason ?? "").length > MAX_FREE_TEXT_LENGTH) return INVALID;
  return { ok: true };
}
