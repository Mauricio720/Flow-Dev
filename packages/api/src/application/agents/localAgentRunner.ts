import type { AgentChoice } from "./agentTypes";

export type AgentRun = {
  choice: AgentChoice;
  instructions: string;
  prompt: string;
  outputSchema: object;
  context: { url: string; capability: string };
  timeoutMs: number;
  signal: AbortSignal;
};

export type AgentRunFailure =
  | "missing_binary"
  | "not_signed_in"
  | "usage_limit"
  | "provider_failed"
  | "invalid_output"
  | "timeout"
  | "cancelled"
  | "isolation_unavailable"
  | "model_unavailable";

export type AgentRunResult = { output: unknown; durationMs: number; exitCode?: number | null };

export class AgentRunError extends Error {
  outputBytes: number | null = null;

  constructor(readonly failure: AgentRunFailure, readonly detail = "", readonly exitCode: number | null = null) {
    super(failure);
  }

  withOutputBytes(bytes: number) {
    this.outputBytes = bytes;
    return this;
  }
}

export interface LocalAgentRunner {
  run(input: AgentRun): Promise<AgentRunResult>;
}
