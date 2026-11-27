import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HookPayload } from "../../application/terminal/agentSessionRuntime";
import type { Question } from "../../application/terminal/sessionInteraction";
import type { SessionPurposeKind } from "../../application/terminal/sessionPurposeKind";
import { FAKE_SCRIPT_VARIABLE } from "./terminalPorts";

export type ScriptStep =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string }
  | { kind: "tool_result"; text: string }
  | { kind: "subagent_text"; text: string }
  | { kind: "ask"; questions: Question[] }
  | { kind: "permission"; toolName: string; input: Record<string, unknown>; suggestions?: unknown[] }
  | { kind: "hook"; payload: HookPayload }
  | { kind: "write_file"; path: string; content: string; shell?: boolean }
  | { kind: "wait_message" }
  | { kind: "end_turn" }
  | { kind: "fail"; detail: string }
  | { kind: "crash" };

export type ScriptContext = { sessionId: string; cwd: string; purpose: SessionPurposeKind };
export type ScriptSource = ScriptStep[] | ((context: ScriptContext) => ScriptStep[]);

const TEST_ENVIRONMENT = "test";

export function scriptFromEnvironment(env: NodeJS.ProcessEnv): ScriptSource | null {
  const directory = env[FAKE_SCRIPT_VARIABLE];
  if (!directory || env.NODE_ENV !== TEST_ENVIRONMENT) return null;
  return ({ cwd, purpose }) => {
    const purposeFile = scriptFileFor(directory, cwd, purpose);
    const file = existsSync(purposeFile) ? purposeFile : scriptFileFor(directory, cwd);
    return JSON.parse(readFileSync(file, "utf8")) as ScriptStep[];
  };
}

export function scriptFileFor(directory: string, cwd: string, purpose?: SessionPurposeKind): string {
  const suffix = purpose ? `${purpose}-` : "";
  return join(directory, `${suffix}${createHash("sha256").update(cwd).digest("hex")}.json`);
}

export function stepsOf(source: ScriptSource | undefined, context: ScriptContext): ScriptStep[] {
  if (!source) return [];
  return typeof source === "function" ? source(context) : source;
}
