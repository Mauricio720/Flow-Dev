import type { CanUseTool, EffortLevel, Options, PermissionMode as SdkPermissionMode } from "@anthropic-ai/claude-agent-sdk";
import type { PermissionMode } from "../../application/terminal/sessionInteraction";
import { SESSION_SYSTEM_PROMPT } from "./agentSdkSystemPrompt";
import { terminalEnvironment } from "./terminalEnvironment";
import { credentialEnvironment } from "../agents/agentEnvironment";

export const SDK_PERMISSION_MODES: Record<PermissionMode, SdkPermissionMode> = { bypass: "bypassPermissions", accept_edits: "acceptEdits", ask_all: "default" };
const SETTING_SOURCES: Options["settingSources"] = ["user", "project", "local"];

export type QueryOptionsInput = {
  cwd: string;
  contextDir: string;
  permissionMode: PermissionMode;
  claudePath: string;
  env: NodeJS.ProcessEnv;
  canUseTool: CanUseTool;
  hooks: Options["hooks"];
  resumeId?: string;
  model?: string;
  effort?: string;
  credentialHome?: string;
  stderr?: (data: string) => void;
};

export function buildQueryOptions(input: QueryOptionsInput): Options {
  const permissionMode = SDK_PERMISSION_MODES[input.permissionMode];
  return {
    cwd: input.cwd,
    pathToClaudeCodeExecutable: input.claudePath,
    env: { ...terminalEnvironment(input.env), ...(input.credentialHome ? credentialEnvironment("claude", input.credentialHome) : {}) },
    plugins: [{ type: "local", path: input.contextDir }],
    systemPrompt: SESSION_SYSTEM_PROMPT,
    settingSources: SETTING_SOURCES,
    permissionMode,
    allowDangerouslySkipPermissions: permissionMode === "bypassPermissions",
    toolConfig: { askUserQuestion: { previewFormat: "markdown" } },
    canUseTool: input.canUseTool,
    hooks: input.hooks,
    ...(input.resumeId ? { resume: input.resumeId } : {}),
    ...(input.model ? { model: input.model } : {}),
    ...(input.effort ? { effort: input.effort as EffortLevel } : {}),
    ...(input.stderr ? { stderr: input.stderr } : {}),
  };
}
