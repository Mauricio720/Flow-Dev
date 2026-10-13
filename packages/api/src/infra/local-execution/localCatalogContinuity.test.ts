import { describe, expect, it } from "vitest";
import type { LocalProviderCatalogEntry } from "../../application/database/dao/localConnectorDao";
import { LIVE_CATALOG_GRACE_MS, withLastLiveCatalog } from "./localCatalogContinuity";

const NOW = new Date("2026-10-09T19:10:00.000Z");
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const live = { modelId: "claude-sonnet-5", displayName: "Sonnet 5", selectable: true, unselectableReason: null, reasoningChoices: [null, "high"] };
const unconfirmed = { modelId: "claude-sonnet-5", displayName: "Claude Sonnet 5", selectable: false, unselectableReason: "catalog_stale", reasoningChoices: [] };
const claude = (models: LocalProviderCatalogEntry["models"]): LocalProviderCatalogEntry => ({ providerId: "claude", providerKind: "claude", label: "Claude local", models });

describe("local provider catalog continuity", () => {
  it("records when a provider was last confirmed live", () => {
    const result = withLastLiveCatalog({ discovered: [claude([live])], previous: [], liveAt: {}, now: NOW });
    expect(result).toEqual({ providers: [claude([live])], liveAt: { claude: NOW.toISOString() } });
  });

  it("keeps the last live catalog when a refresh confirms no model", () => {
    const result = withLastLiveCatalog({ discovered: [claude([unconfirmed])], previous: [claude([live])], liveAt: { claude: minutesAgo(3) }, now: NOW });
    expect(result).toEqual({ providers: [claude([live])], liveAt: { claude: minutesAgo(3) } });
  });

  it("reports the unconfirmed catalog once the grace period is over", () => {
    const expired = new Date(NOW.getTime() - LIVE_CATALOG_GRACE_MS).toISOString();
    const result = withLastLiveCatalog({ discovered: [claude([unconfirmed])], previous: [claude([live])], liveAt: { claude: expired }, now: NOW });
    expect(result).toEqual({ providers: [claude([unconfirmed])], liveAt: {} });
  });

  it("does not hide a model the provider reports as unavailable", () => {
    const unavailable = { ...unconfirmed, unselectableReason: "model_unavailable" };
    const result = withLastLiveCatalog({ discovered: [claude([unavailable])], previous: [claude([live])], liveAt: { claude: minutesAgo(1) }, now: NOW });
    expect(result.providers).toEqual([claude([unavailable])]);
  });

  it("does not revive a provider that is no longer reported", () => {
    const result = withLastLiveCatalog({ discovered: [], previous: [claude([live])], liveAt: { claude: minutesAgo(1) }, now: NOW });
    expect(result).toEqual({ providers: [], liveAt: {} });
  });

  it("has nothing to keep when the provider was never confirmed live", () => {
    const result = withLastLiveCatalog({ discovered: [claude([unconfirmed])], previous: [claude([unconfirmed])], liveAt: {}, now: NOW });
    expect(result).toEqual({ providers: [claude([unconfirmed])], liveAt: {} });
  });
});
