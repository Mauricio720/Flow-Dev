import { DISPLAY_RULES, genericDisplay } from "./permissionDisplayRules";
import { MAX_DISPLAY_LENGTH, truncateWithMarker } from "./sessionInteractionLimits";

export type PermissionSummaryInput = { toolName: string; input: Record<string, unknown>; cwd: string };
export type PermissionSummary = { title: string; body: string; truncated: boolean };

export function summarizePermissionRequest(request: PermissionSummaryInput): PermissionSummary {
  const rule = DISPLAY_RULES[request.toolName];
  const parts = rule ? rule(request.input, request.cwd) : genericDisplay(request.toolName, request.input);
  const body = truncateWithMarker(parts.body, MAX_DISPLAY_LENGTH);
  return { title: parts.title, body: body.text, truncated: body.truncated };
}
