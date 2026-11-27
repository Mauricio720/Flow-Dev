import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { FAKE_CLI, FIXTURES_DIRECTORY } from "../../../test/fixtures/agents/fakeCliPath";
import type { AgentRun } from "../../application/agents/localAgentRunner";
import { ClaudeCodeRunner } from "./claudeCodeRunner";

const SCHEMA = { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" };
const CAPABILITY = "c".repeat(40);

function request(scenario: object, overrides: Partial<AgentRun> = {}): AgentRun {
  return { choice: { provider: "claude", model: "sonnet", effort: "low" }, instructions: "Seja objetivo.", prompt: JSON.stringify(scenario), images: [], outputSchema: SCHEMA, context: { url: "http://127.0.0.1:1/mcp/e", capability: CAPABILITY }, timeoutMs: 10000, signal: new AbortController().signal, ...overrides };
}

const runner = new ClaudeCodeRunner({ bin: FAKE_CLI, env: { PATH: process.env.PATH, HOME: "/home/test", DATABASE_URL: "postgres://secret" } });
const fixture = (name: string) => ({ mode: "fixture", file: `${FIXTURES_DIRECTORY}claude/${name}.json` });

async function failureOf(promise: Promise<unknown>) {
  return promise.then(() => null, (caught: unknown) => caught as { failure: string; detail: string });
}

describe("Claude Code runner", () => {
  it("V-05a starts the CLI with exactly the isolation arguments from the spike", async () => {
    const { output } = await runner.run(request({ mode: "dump" }));
    const dump = output as { args: string[]; mcp: string; env: Record<string, string> };
    const schema = JSON.stringify({ type: "object" });
    expect(dump.args).toEqual(["-p", "--output-format", "json", "--json-schema", schema, "--tools", "", "--strict-mcp-config", "--mcp-config", expect.stringContaining("mcp.json"), "--allowedTools", "mcp__flow__*", "--setting-sources", "", "--no-session-persistence", "--system-prompt", "Seja objetivo.", "--model", "sonnet", "--effort", "low"]);
    expect(JSON.parse(dump.mcp)).toEqual({ mcpServers: { flow: { type: "http", url: "http://127.0.0.1:1/mcp/e", headers: { Authorization: `Bearer ${CAPABILITY}` } } } });
  });

  it("V-20e gives the isolated runner no settings, hooks or events url", async () => {
    const { output } = await runner.run(request({ mode: "dump" }));
    const dump = JSON.stringify(output);
    expect(dump).not.toMatch(/--settings|hooks|terminal-sessions\/events/);
  });

  it("never shows the capability in the arguments and drops variables outside the allow list", async () => {
    const { output } = await runner.run(request({ mode: "dump" }));
    const dump = output as { args: string[]; env: Record<string, string> };
    expect(dump.args.join(" ")).not.toContain(CAPABILITY);
    expect(dump.env).not.toHaveProperty("DATABASE_URL");
    expect(dump.env.HOME).toBe("/home/test");
  });

  it("V-05c removes the temporary directory after a success and after a failure", async () => {
    const { output } = await runner.run(request({ mode: "dump" }));
    const { cwd } = output as { cwd: string };
    expect(existsSync(cwd)).toBe(false);
    await failureOf(runner.run(request(fixture("not-signed-in"))));
    expect(existsSync(cwd)).toBe(false);
  });

  it("V-05d trusts only structured_output when the textual result diverges", async () => {
    const stdout = JSON.stringify({ type: "result", is_error: false, result: "{\"status\":\"other\"}", structured_output: { status: "draft_ready" } });
    const { output } = await runner.run(request({ mode: "raw", stdout }));
    expect(output).toEqual({ status: "draft_ready" });
  });

  it("returns the structured output of the real success fixture", async () => {
    const { output } = await runner.run(request(fixture("success")));
    expect(output).toMatchObject({ status: "draft_ready" });
    const stored = JSON.parse(readFileSync(`${FIXTURES_DIRECTORY}claude/success.json`, "utf8"));
    expect(JSON.parse(stored.stdout).structured_output).toEqual(output);
  });

  it("V-02e treats exit 0 without structured output as invalid_output", async () => {
    expect(await failureOf(runner.run(request(fixture("invalid-json"))))).toMatchObject({ failure: "invalid_output" });
  });

  it("V-03a reports a missing binary naming Claude Code", async () => {
    const missing = new ClaudeCodeRunner({ bin: "/nonexistent/claude" });
    const error = await failureOf(missing.run(request({ mode: "echo" })));
    expect(error).toMatchObject({ failure: "missing_binary" });
    expect(error?.detail).toContain("Claude Code");
  });

  it("classifies the signed-out and usage-limit fixtures", async () => {
    expect(await failureOf(runner.run(request(fixture("not-signed-in"))))).toMatchObject({ failure: "not_signed_in" });
    expect(await failureOf(runner.run(request(fixture("usage-limit"))))).toMatchObject({ failure: "usage_limit", detail: "Claude Code" });
  });

  it("refuses a model outside the catalog without starting the CLI", async () => {
    const choice = { provider: "claude" as const, model: "gpt-antigo", effort: "low" as const };
    expect(await failureOf(runner.run(request({ mode: "echo" }, { choice })))).toMatchObject({ failure: "model_unavailable" });
  });

  it("V-11e keeps the planning agents free of --add-dir, --plugin-dir and terminal session folders", async () => {
    const { output } = await runner.run(request({ mode: "dump" }));
    const joined = (output as { args: string[] }).args.join(" ");
    expect(joined).not.toMatch(/--add-dir|--plugin-dir|terminal-sessions/);
  });
});
