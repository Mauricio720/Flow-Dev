import { execFileSync } from "node:child_process";
import { delimiter, join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { terminalEnvironment } from "../../../../packages/api/src/infra/terminal/terminalEnvironment";
import type { Log } from "./spikeLog";

export const PROMPT = "Responda só OK.";

export type Observation = {
  initModel: string | null;
  sessionId: string | null;
  resultSubtype: string | null;
  isError: boolean;
  resultText: string | null;
  assistantError: string | null;
  thrown: string | null;
  usageModels: string[];
};

export function claudePath(): string {
  const candidates = (process.env.PATH ?? "").split(delimiter).map((dir) => join(dir, "claude"));
  const found = candidates.find((path) => {
    try {
      execFileSync(path, ["--version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  });
  if (!found) throw new Error("claude não encontrado no PATH");
  return found;
}

export function buildOptions(cwd: string, extra: Options): Options {
  return {
    cwd,
    pathToClaudeCodeExecutable: claudePath(),
    env: terminalEnvironment(process.env),
    settingSources: ["user", "project", "local"],
    permissionMode: "default",
    maxTurns: 1,
    ...extra,
  };
}

function emptyObservation(): Observation {
  return { initModel: null, sessionId: null, resultSubtype: null, isError: false, resultText: null, assistantError: null, thrown: null, usageModels: [] };
}

function absorb(observation: Observation, message: SDKMessage) {
  if (message.type === "system" && message.subtype === "init") {
    observation.initModel = message.model;
    observation.sessionId = message.session_id;
  }
  if (message.type === "assistant" && message.error) observation.assistantError = message.error;
  if (message.type !== "result") return;
  observation.resultSubtype = message.subtype;
  observation.isError = message.is_error;
  observation.resultText = "result" in message ? message.result : null;
  observation.usageModels = Object.keys(message.modelUsage ?? {});
}

export async function runOnce(input: { options: Options; log: Log; label: string; prompt?: string }): Promise<Observation> {
  const observation = emptyObservation();
  try {
    for await (const message of query({ prompt: input.prompt ?? PROMPT, options: input.options })) absorb(observation, message);
  } catch (error) {
    observation.thrown = error instanceof Error ? error.message : String(error);
  }
  input.log.json(input.label, observation);
  return observation;
}
