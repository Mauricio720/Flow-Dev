import { describe, expect, it, vi } from "vitest";
import { CODEX_LOGIN, CODEX_MISSING, CODEX_TOO_OLD } from "../../../application/services/terminal/codexCatalogRules";
import { LocalCodexCatalogProbe } from "./codexCatalogProbe";

const now = () => new Date("2026-11-23T14:32:00Z");

describe("LocalCodexCatalogProbe", () => {
  it("V-50b reports absent PATH binary without launching a process", async () => {
    const transport = vi.fn(() => { throw new Error("unused"); });
    const readVersion = vi.fn();
    const probe = new LocalCodexCatalogProbe({ tools: { locate: async () => null, has: async () => false }, transport, readVersion, now });
    expect(await probe.read()).toMatchObject({ available: false, reason: CODEX_MISSING });
    expect(readVersion).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it("V-50c rejects old versions and continues at the minimum and later versions", async () => {
    const readCatalog = vi.fn(async () => ({ loggedIn: true, models: [{ id: "m", displayName: "Model", hidden: false, isDefault: true, supportedReasoningEfforts: [{ reasoningEffort: "high" }], defaultReasoningEffort: "high" }] }));
    const probe = (version: string) => new LocalCodexCatalogProbe({ tools: { locate: async () => "/fake/codex", has: async () => true }, readVersion: async () => version, transport: () => ({ readCatalog }), now });
    expect((await probe("0.159.2").read()).reason).toBe(CODEX_TOO_OLD);
    expect((await probe("0.159.3").read()).available).toBe(true);
    expect((await probe("0.160.0").read()).available).toBe(true);
    expect(readCatalog).toHaveBeenCalledTimes(2);
  });

  it("V-50d maps an absent account to the login instruction", async () => {
    const probe = new LocalCodexCatalogProbe({ tools: { locate: async () => "/fake/codex", has: async () => true }, readVersion: async () => "0.159.3", transport: () => ({ readCatalog: async () => ({ loggedIn: false, models: [] }) }), now });
    expect(await probe.read()).toMatchObject({ available: false, reason: CODEX_LOGIN });
  });
});
