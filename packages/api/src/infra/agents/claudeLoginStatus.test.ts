import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseClaudeLoginStatus } from "./claudeLoginStatus";

const fixture = (name: string) => readFile(new URL(`../../../test/fixtures/claude-auth-status/${name}.json`, import.meta.url), "utf8");

describe("parseClaudeLoginStatus", () => {
  it("V-03b recognizes a Claude subscription and returns its identity and plan", async () => {
    expect(parseClaudeLoginStatus(await fixture("logged-in"))).toEqual({ status: "logged_in", identity: "ana@exemplo.com", plan: "max", detail: null });
  });

  it("V-03c rejects API key authentication and treats an empty account as logged out", async () => {
    expect(parseClaudeLoginStatus(await fixture("api-key"))).toEqual({ status: "logged_out", identity: null, plan: null, detail: null });
    expect(parseClaudeLoginStatus(await fixture("logged-out"))).toEqual({ status: "logged_out", identity: null, plan: null, detail: null });
  });
});
