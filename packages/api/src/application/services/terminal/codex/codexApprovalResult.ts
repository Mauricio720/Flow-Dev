import type { RuntimePermissionRequest, RuntimePermissionResult } from "../../../terminal/agentSessionRuntime";

export type CodexApprovalResponse = { decision: unknown };

function denied(): CodexApprovalResponse {
  return { decision: "decline" };
}

function allowed(request: RuntimePermissionRequest, result: RuntimePermissionResult): CodexApprovalResponse | null {
  if (result.behavior !== "allow") return null;
  if (!("decision" in result)) return { decision: "accept" };
  if (result.decision === "allow_session" && request.offers?.includes("allow_session")) return { decision: "acceptForSession" };
  if (result.decision !== "allow_always" || request.alwaysScope !== "machine" || !request.offers?.includes("allow_always")) return null;
  const amendment = request.suggestions.filter((rule): rule is string => typeof rule === "string");
  if (amendment.length === 0) return null;
  return { decision: { acceptWithExecpolicyAmendment: { execpolicy_amendment: amendment } } };
}

export function translateCodexApprovalResult(request: RuntimePermissionRequest, result: RuntimePermissionResult): CodexApprovalResponse | null {
  return result.behavior === "deny" ? denied() : allowed(request, result);
}
