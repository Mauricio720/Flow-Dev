import { describe, expect, it } from "vitest";
import { PublishedCodexCatalog } from "./publishedCodexCatalog";

const NOW = new Date("2026-11-25T12:00:00Z");
const PUBLISHED = { available: true, reason: null, version: "0.159.3", refreshedAt: NOW.toISOString(), models: [{ id: "m1", label: "Model 1", isDefault: true, efforts: ["high"], defaultEffort: "high" }] };

describe("PublishedCodexCatalog", () => {
  it("returns the catalog the session service published for this host", async () => {
    const catalog = new PublishedCodexCatalog({ codexStatus: async () => PUBLISHED }, () => NOW);
    expect(await catalog.read()).toEqual(PUBLISHED);
  });

  it("reports the catalog as not yet published when the host has none", async () => {
    const catalog = new PublishedCodexCatalog({ codexStatus: async () => null }, () => NOW);
    expect(await catalog.read()).toEqual({ available: false, reason: "O catálogo do Codex ainda não foi publicado.", version: null, models: [], refreshedAt: NOW.toISOString() });
  });
});
