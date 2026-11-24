import type { RuntimeChoice } from "../../../application/terminal/agentSessionRuntime";
import type { PermissionMode } from "../../../application/terminal/sessionInteraction";
import type { ThreadResumeRequest, ThreadStartRequest, TurnStartRequest } from "./protocol/codexMethods";

export const CODEX_QUESTION_TOOL_ENABLED = true;
export type CodexThreadOptions = { start: ThreadStartRequest & { ephemeral: false }; resume: Omit<ThreadResumeRequest, "threadId">; turn: Pick<TurnStartRequest, "model" | "effort"> };

function policyOf(mode: PermissionMode) {
  if (mode === "bypass") return { approvalPolicy: "never" as const, sandbox: "danger-full-access" as const };
  return { approvalPolicy: "untrusted" as const, sandbox: "workspace-write" as const };
}

export function codexThreadOptions(input: { cwd: string; choice: RuntimeChoice; permissionMode: PermissionMode; requestUserInput?: boolean }): CodexThreadOptions {
  const policy = policyOf(input.permissionMode);
  const config = { features: { default_mode_request_user_input: input.requestUserInput ?? CODEX_QUESTION_TOOL_ENABLED } };
  const shared = { cwd: input.cwd, model: input.choice.model, ...policy, config };
  return { start: { ...shared, ephemeral: false }, resume: shared, turn: { model: input.choice.model, effort: input.choice.effort } };
}
