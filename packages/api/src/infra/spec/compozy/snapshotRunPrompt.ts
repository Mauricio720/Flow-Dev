import { createHash } from "node:crypto";
import type { ExecutionRequest } from "../../../application/services/task-flow/actionExecutor";
import type { SkillFlowAction } from "../../../application/services/task-flow/flowContracts";
import type { RuntimeIdentity, SpecRuntimeGateway } from "../../../application/spec/specRuntimeGateway";
import { buildUnifiedPrompt, type PromptTask } from "./unifiedPrompt";

export const FIRST_PROMPT_PURPOSE = "prompt";
export const RETRY_PROMPT_PURPOSE = "prompt-retry";
const MESSAGE_PURPOSE = "message";

export type RunPromptDependencies = {
  gateway: Pick<SpecRuntimeGateway, "submit">;
  taskFor(request: ExecutionRequest): Promise<PromptTask>;
  workspaceRoot?(request: ExecutionRequest): string;
};

export const idFor = (runId: string, purpose: string) => createHash("sha256").update(`${purpose}:${runId}`).digest("hex").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*$/, "$1-$2-$3-$4-$5");

const messagePurpose = (purpose: string) => purpose === FIRST_PROMPT_PURPOSE ? MESSAGE_PURPOSE : `${MESSAGE_PURPOSE}:${purpose}`;

export async function submitRunPrompt(deps: RunPromptDependencies, request: ExecutionRequest, target: RuntimeIdentity & { purpose: string }) {
  const action = request.snapshot as SkillFlowAction & typeof request.snapshot;
  const message = buildUnifiedPrompt({ action, task: await deps.taskFor(request), workspaceRoot: deps.workspaceRoot?.(request) });
  const { runtime } = action;
  const { purpose, ...identity } = target;
  return deps.gateway.submit({ ...identity, messageId: idFor(request.run.id, messagePurpose(purpose)), idempotencyKey: idFor(request.run.id, purpose), message, provider: action.runtimeProviderIds[runtime.connectionId], model: runtime.modelId, reasoningEffort: runtime.reasoningEffort });
}
