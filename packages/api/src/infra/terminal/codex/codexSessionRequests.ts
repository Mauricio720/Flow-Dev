import type { RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import { codexApprovalCanAutoAccept, type CodexApprovalInput } from "../../../application/services/terminal/codex/codexApprovalTranslator";
import { translateCodexApprovalResult } from "../../../application/services/terminal/codex/codexApprovalResult";
import { translateCodexQuestionAnswer } from "../../../application/services/terminal/codex/codexQuestionTranslator";
import { translateCodexRequest, type CodexServerRequest } from "../../../application/services/terminal/codex/codexRequestTranslator";
import type { PermissionsRequestApprovalResponse } from "./protocol/codexMethods";
import type { GrantedPermissionProfile } from "./protocol/generated/v2/GrantedPermissionProfile";

type RequestAnswer = { input: RuntimeStartInput; method: string; params: unknown; onDenied?: (message: string) => void };

export async function answerCodexRequest({ input, method, params, onDenied }: RequestAnswer) {
  const request: CodexServerRequest = { method, params: params as CodexServerRequest["params"] };
  const translated = translateCodexRequest(request);
  if (!translated) return { decision: "decline" };
  if (translated.permissionKind && codexApprovalCanAutoAccept({ method, params: request.params as CodexApprovalInput, permissionMode: input.permissionMode, checkoutPath: input.cwd })) {
    if (method === "item/permissions/requestApproval") return permissionResponse(translated, { behavior: "allow" });
    return { decision: "accept" };
  }
  const result = await input.handlers.onPermission(translated);
  if (method === "item/tool/requestUserInput") return translateCodexQuestionAnswer(result) ?? { answers: {} };
  if (result.behavior === "deny" && result.message) onDenied?.(result.message);
  if (method === "item/permissions/requestApproval") return permissionResponse(translated, result);
  return translateCodexApprovalResult(translated, result) ?? { decision: "decline" };
}

function permissionResponse(request: NonNullable<ReturnType<typeof translateCodexRequest>>, result: Awaited<ReturnType<RuntimeStartInput["handlers"]["onPermission"]>>): PermissionsRequestApprovalResponse {
  const requested = request.input.permissions as GrantedPermissionProfile | undefined;
  const permissions: GrantedPermissionProfile = result.behavior === "allow" && requested ? requested : {};
  return { permissions, scope: "turn" };
}
