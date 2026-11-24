import { CODEX_CATALOG_REFRESH_MS, type CodexCatalogPublisher } from "./codexCatalogPublisher";

export type CatalogSchedule = (tick: () => Promise<void>, intervalMs: number) => () => void;

const scheduleInterval: CatalogSchedule = (tick, intervalMs) => {
  const timer = setInterval(() => void tick(), intervalMs);
  return () => clearInterval(timer);
};

export class CodexCatalogStep {
  constructor(private readonly publisher: CodexCatalogPublisher, private readonly schedule: CatalogSchedule = scheduleInterval, private readonly intervalMs = CODEX_CATALOG_REFRESH_MS) {}

  async start() {
    await this.publisher.refresh().catch(() => undefined);
    return this.schedule(() => this.publisher.refresh().catch(() => undefined), this.intervalMs);
  }
}
