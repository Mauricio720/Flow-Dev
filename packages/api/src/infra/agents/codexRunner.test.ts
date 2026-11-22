import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FAKE_CLI, FIXTURES_DIRECTORY } from "../../../test/fixtures/agents/fakeCliPath";
import type { AgentRun } from "../../application/agents/localAgentRunner";
import { CodexRunner } from "./codexRunner";

const CAPABILITY = "k".repeat(40);
let home = "";
beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), "codex-test-home-"));
  mkdirSync(join(home, ".codex"));
  writeFileSync(join(home, ".codex", "auth.json"), "{}");
});
afterAll(() => rmSync(home, { recursive: true, force: true }));

function request(scenario: object): AgentRun {
  return { choice: { provider: "codex", model: "gpt-6.1-sol", effort: "medium" }, instructions: "Seja objetivo.", prompt: JSON.stringify(scenario), outputSchema: { $schema: "x", type: "object" }, context: { url: "http://127.0.0.1:1/mcp/e", capability: CAPABILITY }, timeoutMs: 10000, signal: new AbortController().signal };
}

const runner = () => new CodexRunner({ bin: FAKE_CLI, env: { PATH: process.env.PATH, HOME: home, DATABASE_URL: "postgres://secret" } });
const fixture = (name: string, exitCode: number) => ({ mode: "fixture", file: `${FIXTURES_DIRECTORY}codex/${name}.jsonl`, exitCode });
const failureOf = (promise: Promise<unknown>) => promise.then(() => null, (caught: unknown) => caught as { failure: string; detail: string });

describe("Codex runner", () => {
  it("V-05e starts exec with exactly the isolation arguments from the spike and reads the output schema JSON", async () => {
    const { output } = await runner().run(request({ mode: "dump" }));
    const dump = output as { args: string[]; env: Record<string, string>; cwd: string; codexHomeFiles: string[]; stdin: string };
    const features = ["shell_tool", "unified_exec", "multi_agent", "multi_agent_v2", "apps", "browser_use", "browser_use_external", "computer_use", "image_generation", "view_image", "skill_search", "plugins", "hooks", "goals", "memories", "tool_suggest", "sleep_tool", "shell_snapshot"];
    expect(dump.args.slice(0, 3)).toEqual(["exec", "--ephemeral", "--skip-git-repo-check"]);
    expect(dump.args).toEqual(expect.arrayContaining(["--ignore-user-config", "--ignore-rules", "-s", "read-only", "--json", "-m", "gpt-6.1-sol", "model_reasoning_effort=medium", 'mcp_servers.flow.url="http://127.0.0.1:1/mcp/e"', "mcp_servers.flow.bearer_token_env_var=FLOW_CONTEXT_TOKEN", "mcp_servers.flow.default_tools_approval_mode=approve", 'web_search="disabled"']));
    for (const feature of features) expect(dump.args.join(" ")).toContain(`--disable ${feature}`);
    expect(dump.args.at(-1)).toBe("-");
    expect(dump.args.join(" ")).not.toContain(CAPABILITY);
    expect(dump.env.FLOW_CONTEXT_TOKEN).toBe(CAPABILITY);
    expect(dump.env).not.toHaveProperty("DATABASE_URL");
    expect(dump.codexHomeFiles).toEqual(["auth.json"]);
    expect(dump.stdin.startsWith("Seja objetivo.")).toBe(true);
  });

  it("removes the temporary directory after the run", async () => {
    const { output } = await runner().run(request({ mode: "dump" }));
    expect(existsSync((output as { cwd: string }).cwd)).toBe(false);
  });

  it("returns the JSON of the last agent message in the real success fixture", async () => {
    const { output } = await runner().run(request(fixture("success", 0)));
    expect(output).toMatchObject({ status: "draft_ready" });
  });

  it("V-02e treats a plain text answer as invalid_output", async () => {
    expect(await failureOf(runner().run(request(fixture("invalid-json", 0))))).toMatchObject({ failure: "invalid_output" });
  });

  it("V-03c classifies the usage limit and names Codex", async () => {
    expect(await failureOf(runner().run(request(fixture("usage-limit", 1))))).toMatchObject({ failure: "usage_limit", detail: "Codex" });
  });

  it("classifies the signed-out events and asks for codex login", async () => {
    const error = await failureOf(runner().run(request(fixture("not-signed-in", 1))));
    expect(error).toMatchObject({ failure: "not_signed_in" });
    expect(error?.detail).toContain("codex login");
  });

  it("fails as not signed in, without starting the CLI, when auth.json is missing", async () => {
    const empty = mkdtempSync(join(tmpdir(), "codex-empty-home-"));
    const bare = new CodexRunner({ bin: "/nonexistent/codex", env: { PATH: process.env.PATH, HOME: empty } });
    const error = await failureOf(bare.run(request({ mode: "echo" })));
    rmSync(empty, { recursive: true, force: true });
    expect(error).toMatchObject({ failure: "not_signed_in" });
    expect(error?.detail).toContain("codex login");
  });

  it("V-03a reports a missing binary naming Codex", async () => {
    const missing = new CodexRunner({ bin: "/nonexistent/codex", env: { PATH: process.env.PATH, HOME: home } });
    const error = await failureOf(missing.run(request({ mode: "echo" })));
    expect(error).toMatchObject({ failure: "missing_binary" });
    expect(error?.detail).toContain("Codex");
  });
});
