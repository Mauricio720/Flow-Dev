import { AgentRunError } from "../../application/agents/localAgentRunner";
import { classifyFailure } from "./agentFailure";
import type { ProcessResult } from "./agentProcess";

const SIGNED_OUT_EVENT = /401 Unauthorized/;

function events(stdout: string) {
  const parsed: Array<Record<string, any>> = [];
  for (const line of stdout.split("\n")) {
    try { const value = JSON.parse(line); if (value && typeof value === "object") parsed.push(value); } catch { continue; }
  }
  return parsed;
}

export function isCodexComplete(stdout: string) {
  return events(stdout).some((event) => event.type === "turn.completed" || event.type === "turn.failed" || (event.type === "error" && SIGNED_OUT_EVENT.test(String(event.message))));
}

export function interpretCodex(result: ProcessResult) {
  const list = events(result.stdout);
  const exitFailed = result.exitCode !== null && result.exitCode !== 0;
  const completed = list.some((event) => event.type === "turn.completed");
  if (exitFailed || !completed || list.some((event) => event.type === "turn.failed")) throw classifyFailure("codex", result);
  const messages = list.filter((event) => event.type === "item.completed" && event.item?.type === "agent_message");
  const text = messages.at(-1)?.item?.text;
  return parseObject(text, result.exitCode);
}

function readJson(text: unknown): unknown {
  try { return JSON.parse(String(text)); } catch { return null; }
}

function parseObject(text: unknown, exitCode: number | null) {
  const value = readJson(text);
  if (value && typeof value === "object" && !Array.isArray(value)) return value as object;
  throw new AgentRunError("invalid_output", "no_structured_output", exitCode).withOutputBytes(Buffer.byteLength(String(text ?? "")));
}
