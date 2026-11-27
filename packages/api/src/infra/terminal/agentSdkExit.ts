import type { RuntimeExit } from "../../application/terminal/agentSessionRuntime";
import { CLAUDE_LIMIT_STATUS, isUsageLimit } from "../agents/agentFailure";

export type AgentSdkFailure = { error: unknown; closing: boolean; started: boolean; stderr: string };

export function agentSdkExit({ error, closing, started, stderr }: AgentSdkFailure): RuntimeExit {
  if (closing) return { kind: "ended" };
  const errorDetail = error instanceof Error ? error.message : String(error);
  const detail = stderr || errorDetail;
  if (isUsageLimit(`${stderr}\n${errorDetail}`) || statusOf(error) === CLAUDE_LIMIT_STATUS) return { kind: started ? "crashed" : "failed", detail, limit: true };
  return { kind: started ? "crashed" : "failed", detail };
}

function statusOf(error: unknown) {
  const value = error as { status?: unknown; statusCode?: unknown } | null;
  return value && typeof value === "object" ? value.status ?? value.statusCode : undefined;
}
