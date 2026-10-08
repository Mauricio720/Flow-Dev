import type { ExecutionResult } from "../../../application/services/task-flow/actionExecutor";
import type { RuntimeRejection } from "../../../application/spec/specRuntimeGateway";

const MODEL_REJECTED = "model_unavailable";
const REJECTION_CODES: Record<string, string> = { reasoning_option_missing: "reasoning_effort_unsupported" };

export function rejectedSubmission(rejection: RuntimeRejection | undefined): ExecutionResult {
  const code = REJECTION_CODES[rejection?.code ?? ""] ?? MODEL_REJECTED;
  return { kind: "blocked", code, ...(rejection?.message ? { detail: `O CompozyOS recusou a configuração: ${rejection.message}` } : {}) };
}
