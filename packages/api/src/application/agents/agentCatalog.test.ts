import { describe, expect, it } from "vitest";
import { AGENT_CATALOG, DEFAULT_AGENT_CHOICE, isCatalogChoice } from "./agentCatalog";

describe("agent catalog", () => {
  it("V-08c rejects a model that belongs to another provider and accepts a listed one", () => {
    expect(isCatalogChoice({ provider: "claude", model: "gpt-6.1-sol", effort: "low" })).toBe(false);
    expect(isCatalogChoice({ provider: "claude", model: "sonnet", effort: "low" })).toBe(true);
    expect(isCatalogChoice({ provider: "codex", model: "gpt-6.1-sol", effort: "high" })).toBe(true);
  });

  it("rejects an effort outside low, medium and high", () => {
    const choice = { provider: "claude" as const, model: "sonnet", effort: "max" as never };
    expect(isCatalogChoice(choice)).toBe(false);
  });

  it("V-07f defaults to Claude Code with sonnet and low effort, which the catalog lists", () => {
    expect(DEFAULT_AGENT_CHOICE).toEqual({ provider: "claude", model: "sonnet", effort: "low" });
    expect(isCatalogChoice(DEFAULT_AGENT_CHOICE)).toBe(true);
  });

  it("lists the models confirmed for each provider", () => {
    expect(AGENT_CATALOG).toEqual({ claude: ["sonnet", "opus", "haiku"], codex: ["gpt-6.1-sol"] });
  });
});
