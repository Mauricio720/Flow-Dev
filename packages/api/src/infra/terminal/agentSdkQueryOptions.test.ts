import { describe, expect, it } from "vitest";
import type { CanUseTool } from "@anthropic-ai/claude-agent-sdk";
import { buildHooks } from "./agentSdkHooks";
import { buildQueryOptions, type QueryOptionsInput } from "./agentSdkQueryOptions";

const CLAUDE_PATH = "/home/ana/.local/bin/claude";
const CONTEXT_DIR = "/home/ana/.local/state/flow-dev/terminal-sessions/abc/contexto";
const canUseTool: CanUseTool = async (_tool, input) => ({ behavior: "allow", updatedInput: input });

function inputFor(overrides: Partial<QueryOptionsInput> = {}): QueryOptionsInput {
  const env = { PATH: "/usr/bin", HOME: "/home/ana", CLAUDECODE: "1", CLAUDE_CODE_ENTRYPOINT: "cli", ANTHROPIC_API_KEY: "sk-teste", CLAUDE_CONFIG_DIR: "/home/ana/.claude" };
  return { cwd: "/tmp/x", contextDir: CONTEXT_DIR, permissionMode: "accept_edits", claudePath: CLAUDE_PATH, env, canUseTool, hooks: buildHooks(() => undefined), ...overrides };
}

describe("buildQueryOptions", () => {
  it("V-24h points an accept_edits session at the clone, the local claude, the plugin and the three setting sources", () => {
    const options = buildQueryOptions(inputFor());
    expect(options).toMatchObject({ cwd: "/tmp/x", pathToClaudeCodeExecutable: CLAUDE_PATH, plugins: [{ type: "local", path: CONTEXT_DIR }], settingSources: ["user", "project", "local"], permissionMode: "acceptEdits", allowDangerouslySkipPermissions: false, toolConfig: { askUserQuestion: { previewFormat: "markdown" } } });
    expect(options.resume).toBeUndefined();
  });

  it("V-24h maps bypass to bypassPermissions with the explicit opt-in and ask_all to default", () => {
    expect(buildQueryOptions(inputFor({ permissionMode: "bypass" }))).toMatchObject({ permissionMode: "bypassPermissions", allowDangerouslySkipPermissions: true });
    expect(buildQueryOptions(inputFor({ permissionMode: "ask_all" }))).toMatchObject({ permissionMode: "default", allowDangerouslySkipPermissions: false });
  });

  it("V-24h passes the filtered environment without CLAUDECODE, session variables or an API key, keeping the config dir", () => {
    const { env } = buildQueryOptions(inputFor());
    expect(env).toEqual({ PATH: "/usr/bin", HOME: "/home/ana", CLAUDE_CONFIG_DIR: "/home/ana/.claude" });
  });

  it("V-38a passes the model and effort of the session as options, and none of them when they were not chosen", () => {
    expect(buildQueryOptions(inputFor({ model: "opus", effort: "max" }))).toMatchObject({ model: "opus", effort: "max" });
    expect(buildQueryOptions(inputFor({ model: "sonnet", effort: "high", resumeId: "abc" }))).toMatchObject({ model: "sonnet", effort: "high", resume: "abc" });
    const unchosen = buildQueryOptions(inputFor());
    expect(Object.keys(unchosen)).not.toContain("model");
    expect(Object.keys(unchosen)).not.toContain("effort");
  });

  it("keeps the Claude Code system prompt and tells the session to offer alternatives through AskUserQuestion", () => {
    const { systemPrompt } = buildQueryOptions(inputFor());
    expect(systemPrompt).toMatchObject({ type: "preset", preset: "claude_code", snapshot: true });
    expect(JSON.stringify(systemPrompt)).toContain("AskUserQuestion");
  });

  it("adds resume only for a resumed conversation", () => {
    expect(buildQueryOptions(inputFor({ resumeId: "abc" })).resume).toBe("abc");
  });

  it("subscribes to the three hooks the SDK delivers, with the Spec B matcher on PostToolUse", () => {
    const hooks = buildQueryOptions(inputFor()).hooks!;
    expect(Object.keys(hooks).sort()).toEqual(["PostToolUse", "Stop", "UserPromptSubmit"]);
    expect(hooks.PostToolUse![0]!.matcher).toBe("Write|Edit|MultiEdit|NotebookEdit|Bash|Skill");
  });

  it("forwards the hook input to the handler and answers with an empty output", async () => {
    const received: unknown[] = [];
    const hooks = buildHooks((payload) => received.push(payload));
    const output = await hooks!.Stop![0]!.hooks[0]!({ hook_event_name: "Stop", session_id: "s" } as never, undefined, { signal: new AbortController().signal });
    expect(received).toEqual([{ hook_event_name: "Stop", session_id: "s" }]);
    expect(output).toEqual({});
  });
});
