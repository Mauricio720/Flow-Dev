import type { LocalProviderCatalogEntry } from "../../application/database/dao/localConnectorDao";

const UNCONFIRMED_REASON = "catalog_stale";
export const LIVE_CATALOG_GRACE_MS = 15 * 60_000;

export type CatalogLiveAt = Record<string, string>;
type ContinuityInput = { discovered: LocalProviderCatalogEntry[]; previous: LocalProviderCatalogEntry[]; liveAt: CatalogLiveAt; now: Date };
type ContinuityResult = { providers: LocalProviderCatalogEntry[]; liveAt: CatalogLiveAt };

const isLive = (provider: LocalProviderCatalogEntry) => provider.models.some((model) => model.selectable);
const isUnconfirmed = (provider: LocalProviderCatalogEntry) => provider.models.every((model) => model.unselectableReason === UNCONFIRMED_REASON);

function withinGrace(confirmedAt: string | undefined, now: Date) {
  const elapsed = now.getTime() - Date.parse(confirmedAt ?? "");
  return Number.isFinite(elapsed) && elapsed < LIVE_CATALOG_GRACE_MS;
}

// CompozyOS answers a live refresh that ran out of time with every model unconfirmed. That says nothing
// about the account, so the catalog the provider confirmed minutes ago stays in place for a bounded time.
export function withLastLiveCatalog({ discovered, previous, liveAt, now }: ContinuityInput): ContinuityResult {
  const nextLiveAt: CatalogLiveAt = {};
  const providers = discovered.map((provider) => {
    if (isLive(provider)) {
      nextLiveAt[provider.providerId] = now.toISOString();
      return provider;
    }
    const lastLive = previous.find((candidate) => candidate.providerId === provider.providerId && isLive(candidate));
    const confirmedAt = liveAt[provider.providerId];
    if (!lastLive || !confirmedAt || !isUnconfirmed(provider) || !withinGrace(confirmedAt, now)) return provider;
    nextLiveAt[provider.providerId] = confirmedAt;
    return lastLive;
  });
  return { providers, liveAt: nextLiveAt };
}
