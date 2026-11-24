import type { RuntimePermissionRequest } from "../../../terminal/agentSessionRuntime";
import { translateCodexApproval, type CodexApprovalInput } from "./codexApprovalTranslator";
import { translateCodexQuestion, type CodexQuestionRequest } from "./codexQuestionTranslator";

const USER_INPUT_REQUEST = "item/tool/requestUserInput";

export type CodexServerRequest = { method: string; params: CodexQuestionRequest | CodexApprovalInput | Record<string, unknown> };

export function translateCodexRequest(request: CodexServerRequest): RuntimePermissionRequest | null {
  if (request.method === USER_INPUT_REQUEST) return translateCodexQuestion(request.params as CodexQuestionRequest);
  return translateCodexApproval(request.method, request.params as CodexApprovalInput);
}
