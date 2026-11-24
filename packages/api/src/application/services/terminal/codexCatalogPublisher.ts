import type { SessionHostDao } from "../../terminal/sessionInteractionPorts";
import type { CodexCatalogProbe } from "../../terminal/codexCatalogProbe";
import type { CodexStatus } from "../../terminal/codexCatalog";

export const CODEX_CATALOG_REFRESH_MS = 600_000;
export type CatalogPublisherDeps = { hosts: Pick<SessionHostDao, "publishCodexStatus">; probe: CodexCatalogProbe; hostId: string; now: () => Date; log?: { info(event: string, fields: Record<string, number | string | boolean | null>): void } };

export class CodexCatalogPublisher {
  constructor(private readonly deps: CatalogPublisherDeps) {}

  async refresh() {
    let status: CodexStatus;
    try { status = await this.deps.probe.read(); }
    catch { status = this.failedStatus(); }
    await this.deps.hosts.publishCodexStatus({ hostId: this.deps.hostId, status });
    this.deps.log?.info("codex-catalog", { available: status.available, modelCount: status.models.length, hostId: this.deps.hostId });
  }

  private failedStatus(): CodexStatus {
    return { available: false, reason: "Não foi possível consultar o catálogo do Codex.", version: null, models: [], refreshedAt: this.deps.now().toISOString() };
  }
}
