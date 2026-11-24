import type { RuntimeExit } from "../../application/terminal/agentSessionRuntime";

export type AgentSdkFailure = { error: unknown; closing: boolean; started: boolean; stderr: string };

export function agentSdkExit({ error, closing, started, stderr }: AgentSdkFailure): RuntimeExit {
  if (closing) return { kind: "ended" };
  const detail = stderr || (error instanceof Error ? error.message : String(error));
  return { kind: started ? "crashed" : "failed", detail };
}
