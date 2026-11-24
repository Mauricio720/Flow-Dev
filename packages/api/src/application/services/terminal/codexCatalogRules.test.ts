import { describe, expect, it } from "vitest";
import { catalogStatus, CODEX_EMPTY, CODEX_LOGIN, CODEX_MISSING, CODEX_TOO_OLD, MIN_CODEX_VERSION, versionStatus } from "./codexCatalogRules";

const now = new Date("2026-01-01T00:00:00.000Z");

describe("Codex catalog rules", () => {
  it("reports missing binary and outdated versions with the published copy", () => {
    expect(versionStatus(null, true, now)?.reason).toBe(CODEX_MISSING);
    expect(versionStatus("0.159.2", true, now)?.reason).toBe(CODEX_TOO_OLD);
    expect(versionStatus("0.159.3", true, now)).toBeNull();
    expect(versionStatus("0.160.0", true, now)).toBeNull();
    expect(MIN_CODEX_VERSION).toBe("0.159.3");
  });

  it("requires login and filters hidden models while preserving per-model options", () => {
    const models = [{ id: "m1", displayName: "Model One", hidden: false, isDefault: true, supportedReasoningEfforts: [{ reasoningEffort: "high" }], defaultReasoningEffort: "high" }, { id: "m2", displayName: "Hidden", hidden: true, isDefault: false, supportedReasoningEfforts: [], defaultReasoningEffort: null }];
    expect(versionStatus("0.159.3", false, now)?.reason).toBe(CODEX_LOGIN);
    expect(catalogStatus({ version: "0.159.3", loggedIn: false, models, now })).toMatchObject({ available: false, reason: CODEX_LOGIN, models: [{ id: "m1", label: "Model One", efforts: ["high"], defaultEffort: "high" }] });
    expect(catalogStatus({ version: "0.159.3", loggedIn: true, models: [], now }).reason).toBe(CODEX_EMPTY);
    expect(CODEX_LOGIN).toContain("codex login");
  });
});
