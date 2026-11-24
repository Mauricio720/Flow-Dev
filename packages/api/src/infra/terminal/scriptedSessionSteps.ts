import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { HookPayload } from "../../application/terminal/agentSessionRuntime";
import type { Question } from "../../application/terminal/sessionInteraction";
import { FAKE_SCRIPT_VARIABLE } from "./terminalPorts";

export type ScriptStep =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string }
  | { kind: "tool_result"; text: string }
  | { kind: "subagent_text"; text: string }
  | { kind: "ask"; questions: Question[] }
  | { kind: "permission"; toolName: string; input: Record<string, unknown>; suggestions?: unknown[] }
  | { kind: "hook"; payload: HookPayload }
  | { kind: "write_file"; path: string; content: string }
  | { kind: "wait_message" }
  | { kind: "end_turn" }
  | { kind: "fail"; detail: string }
  | { kind: "crash" };

export type ScriptContext = { sessionId: string; cwd: string };
export type ScriptSource = ScriptStep[] | ((context: ScriptContext) => ScriptStep[]);

const TEST_ENVIRONMENT = "test";

export function scriptFromEnvironment(env: NodeJS.ProcessEnv): ScriptSource | null {
  const directory = env[FAKE_SCRIPT_VARIABLE];
  if (!directory || env.NODE_ENV !== TEST_ENVIRONMENT) return null;
  return ({ cwd }) => JSON.parse(readFileSync(scriptFileFor(directory, cwd), "utf8")) as ScriptStep[];
}

export function scriptFileFor(directory: string, cwd: string): string {
  return join(directory, `${createHash("sha256").update(cwd).digest("hex")}.json`);
}

export function stepsOf(source: ScriptSource | undefined, context: ScriptContext): ScriptStep[] {
  if (!source) return [];
  return typeof source === "function" ? source(context) : source;
}
