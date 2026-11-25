import type { CodexStatus } from "../../terminal/codexCatalog";
import type { CodexCatalogProbe } from "../../terminal/codexCatalogProbe";
import type { SessionCatalogStatus } from "./sessionServiceStatus";

const CATALOG_NOT_PUBLISHED = "O catálogo do Codex ainda não foi publicado.";

export class PublishedCodexCatalog implements CodexCatalogProbe {
  constructor(private readonly catalog: Pick<SessionCatalogStatus, "codexStatus">, private readonly now: () => Date) {}

  async read(): Promise<CodexStatus> {
    const published = await this.catalog.codexStatus();
    if (published) return published;
    return { available: false, reason: CATALOG_NOT_PUBLISHED, version: null, models: [], refreshedAt: this.now().toISOString() };
  }
}
