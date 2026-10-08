import type { ExecutionResult } from "../../application/services/task-flow/actionExecutor";

// The runtime keeps the prompt request open for the whole turn, so the request times out while the agent
// is still working. A run with a known session is therefore watched instead of being reported as lost.
export function trackableRuntime(result: ExecutionResult) {
  if (result.kind === "submitted") return result.runtime;
  return result.kind === "unknown" && result.runtime?.sessionId && result.runtime.workspaceId ? result.runtime : null;
}
