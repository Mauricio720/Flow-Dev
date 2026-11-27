import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FAKE_CLI } from "../../../test/fixtures/agents/fakeCliPath";
import { AGENT_CATALOG } from "../../application/agents/agentCatalog";
import type { AgentRun } from "../../application/agents/localAgentRunner";
import { ProviderRunner } from "./providerRunner";

const SHUTDOWN_LIMIT_MS = 5000;
let home = "";
beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), "provider-home-"));
  mkdirSync(join(home, ".codex"));
  writeFileSync(join(home, ".codex", "auth.json"), "{}");
});
afterAll(() => rmSync(home, { recursive: true, force: true }));

function request(provider: "claude" | "codex", scenario: object, signal = new AbortController().signal): AgentRun {
  const model = provider === "claude" ? "sonnet" : "gpt-6.1-sol";
  return { choice: { provider, model, effort: "low" }, instructions: "i", prompt: JSON.stringify(scenario), images: [], outputSchema: { type: "object" }, context: { url: "http://127.0.0.1:1/mcp/e", capability: "c".repeat(40) }, timeoutMs: 20000, signal };
}

function build(log: string[] = []) {
  return new ProviderRunner({ claudeBin: FAKE_CLI, codexBin: FAKE_CLI, env: { PATH: process.env.PATH, HOME: home }, log: (message) => log.push(message) });
}

const failureOf = (promise: Promise<unknown>) => promise.then(() => null, (caught: unknown) => caught as { failure: string });

describe("provider runner", () => {
  it("V-03e finishes two simultaneous runs independently", async () => {
    const runner = build();
    const first = runner.run(request("claude", { mode: "sleep", ms: 400 }));
    const second = runner.run(request("claude", { mode: "echo" }));
    await expect(second).resolves.toMatchObject({ output: { ok: true } });
    await expect(first).rejects.toMatchObject({ failure: "invalid_output" });
  });

  it("V-03i refuses a provider outside the catalog before spawning anything", async () => {
    const runner = build();
    const input = { ...request("claude", { mode: "echo" }), choice: { provider: "opencode" as never, model: "x", effort: "low" as const } };
    expect(await failureOf(runner.run(input))).toMatchObject({ failure: "isolation_unavailable" });
    expect(Object.keys(AGENT_CATALOG)).toEqual(["claude", "codex"]);
  });

  it("V-04e kills the groups of two active runs on shutdown and rejects both with cancelled", async () => {
    const runner = build();
    const first = failureOf(runner.run(request("claude", { mode: "sleep", ms: 30000 })));
    const second = failureOf(runner.run(request("codex", { mode: "sleep", ms: 30000 })));
    await new Promise((resolve) => setTimeout(resolve, 500));
    const started = Date.now();
    await runner.shutdown();
    expect(Date.now() - started).toBeLessThan(SHUTDOWN_LIMIT_MS);
    expect(await first).toMatchObject({ failure: "cancelled" });
    expect(await second).toMatchObject({ failure: "cancelled" });
    expect(await failureOf(runner.run(request("claude", { mode: "echo" })))).toMatchObject({ failure: "cancelled" });
  });

  it("V-03l logs the CLI version once per provider", async () => {
    const log: string[] = [];
    const runner = build(log);
    await runner.run(request("claude", { mode: "echo" }));
    await runner.run(request("claude", { mode: "echo" }));
    await runner.run(request("codex", { mode: "echo" }));
    expect(log).toEqual(['[agents] cli provider=claude version="fake 1.0.0"', '[agents] cli provider=codex version="fake 1.0.0"']);
  });

  it("V-04f cancels a run that was still probing the CLI version when shutdown happened", async () => {
    const runner = build();
    const pending = failureOf(runner.run(request("claude", { mode: "echo" })));
    await runner.shutdown();
    expect(await pending).toMatchObject({ failure: "cancelled" });
  });
});
