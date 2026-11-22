import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { FIXTURES_DIRECTORY } from "../../../test/fixtures/agents/fakeCliPath";
import { classifyFailure } from "./agentFailure";

function claudeFixture(name: string) {
  return JSON.parse(readFileSync(`${FIXTURES_DIRECTORY}claude/${name}.json`, "utf8")) as { exitCode: number; stdout: string; stderr: string };
}

function codexFixture(name: string, exitCode: number) {
  return { stdout: readFileSync(`${FIXTURES_DIRECTORY}codex/${name}.jsonl`, "utf8"), stderr: "", exitCode };
}

describe("agent failure classifier", () => {
  it("V-03b classifies the Claude signed-out fixture and names the login command", () => {
    const error = classifyFailure("claude", claudeFixture("not-signed-in"));
    expect(error.failure).toBe("not_signed_in");
    expect(error.detail).toContain("claude");
    expect(error.detail).toContain("Claude Code");
  });

  it("V-03b classifies the Codex signed-out fixture and names codex login", () => {
    const error = classifyFailure("codex", codexFixture("not-signed-in", 1));
    expect(error.failure).toBe("not_signed_in");
    expect(error.detail).toContain("codex login");
  });

  it("V-03c classifies the usage limit of each provider and names it", () => {
    const claude = classifyFailure("claude", claudeFixture("usage-limit"));
    const codex = classifyFailure("codex", codexFixture("usage-limit", 1));
    expect(claude).toMatchObject({ failure: "usage_limit", detail: "Claude Code" });
    expect(codex).toMatchObject({ failure: "usage_limit", detail: "Codex" });
  });

  it("V-03d falls back to provider_failed with the CLI name and exit code", () => {
    const error = classifyFailure("claude", { stdout: "", stderr: "something strange", exitCode: 9 });
    expect(error).toMatchObject({ failure: "provider_failed", exitCode: 9 });
    expect(error.detail).toBe("Claude Code (código de saída 9)");
    expect(error.detail).not.toContain("strange");
  });

  it("V-03h lets the limit error win over valid JSON on stdout when the exit code is not zero", () => {
    const stdout = JSON.stringify({ type: "result", is_error: false, structured_output: { status: "draft_ready" }, result: "ok" });
    const error = classifyFailure("claude", { stdout, stderr: "Error: usage limit reached, try later", exitCode: 1 });
    expect(error.failure).toBe("usage_limit");
  });

  it("recognizes an unavailable Claude model by the 404 status", () => {
    const stdout = JSON.stringify({ is_error: true, api_error_status: 404, result: "There's an issue with the selected model (x)." });
    expect(classifyFailure("claude", { stdout, stderr: "", exitCode: 1 }).failure).toBe("model_unavailable");
  });
});
