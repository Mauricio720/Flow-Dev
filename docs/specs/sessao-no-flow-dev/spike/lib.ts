import { execFileSync } from "node:child_process";
import { delimiter, join } from "node:path";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { terminalEnvironment } from "../../../../packages/api/src/infra/terminal/terminalEnvironment";

export * from "./paths";
export * from "./spikeLog";
export * from "./spikeRepo";
export * from "./spikeSession";

export function claudePath(): string {
  const found = (process.env.PATH ?? "").split(delimiter).map((dir) => join(dir, "claude"));
  const resolved = found.find((candidate) => {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  });
  if (!resolved) throw new Error("claude não encontrado no PATH");
  return resolved;
}

export function cleanEnv(): NodeJS.ProcessEnv {
  return terminalEnvironment(process.env);
}

export function baseOptions(cwd: string, extra: Options = {}): Options {
  return {
    cwd,
    pathToClaudeCodeExecutable: claudePath(),
    env: cleanEnv(),
    settingSources: ["user", "project", "local"],
    toolConfig: { askUserQuestion: { previewFormat: "markdown" } },
    ...extra,
  };
}

export const BYPASS: Options = { permissionMode: "bypassPermissions", allowDangerouslySkipPermissions: true };
