import type { CompozyAgentRuntime } from "./compozyGateway";
import { TaskError } from "../services/tasks/taskErrors";

const DEFAULT_PROVIDER = "claude";
const DEFAULT_MODEL = "claude-opus-5-5";
const DEFAULT_REASONING = "high";
const REASONING_EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/i;

export function parseExecutionRuntime(environment: Record<string, string | undefined>): CompozyAgentRuntime {
  const provider = valueOrDefault(environment.COMPOZY_EXECUTION_PROVIDER, DEFAULT_PROVIDER);
  const model = valueOrDefault(environment.COMPOZY_EXECUTION_MODEL, DEFAULT_MODEL);
  const reasoningEffort = valueOrDefault(environment.COMPOZY_EXECUTION_REASONING, DEFAULT_REASONING);
  if (!IDENTIFIER_PATTERN.test(provider) || !IDENTIFIER_PATTERN.test(model)) throw new TaskError("compozy_unconfigured");
  if (!REASONING_EFFORTS.includes(reasoningEffort)) throw new TaskError("compozy_unconfigured");
  return { provider, model, reasoningEffort };
}

function valueOrDefault(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}
