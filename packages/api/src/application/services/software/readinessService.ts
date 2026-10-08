import type { SessionPrincipal } from "../../../context";
import type { SoftwareDao } from "../../database/dao/softwareDao";
import type { CompozyControlGateway } from "../../software/compozyControlGateway";
import type { HostDiagnostics } from "../../software/hostDiagnostics";
import { projectHostLayer } from "../../software/hostReadiness";
import type { ReadinessProjection } from "../../software/readiness";
import { projectReadiness } from "../../software/readinessProjection";
import { projectAccountLayer } from "./accountLayer";
import { projectApplicationLayer } from "./applicationLayer";
import { projectRuntimeLayer } from "./runtimeLayer";
import { requireAdmin, systemClock, type Clock } from "./softwareAccess";

const CONNECTION_SCAN_LIMIT = 50;

export type ReadinessDependencies = { gateway: CompozyControlGateway; host: HostDiagnostics; clock?: Clock };

export class ReadinessService {
  private lastKnown: ReadinessProjection | null = null;

  constructor(private readonly dao: SoftwareDao, private readonly deps: ReadinessDependencies) {}

  async readiness(actor: SessionPrincipal): Promise<ReadinessProjection> {
    await requireAdmin(this.dao, actor);
    return this.fresh();
  }

  async fresh(): Promise<ReadinessProjection> {
    const clock = this.deps.clock ?? systemClock;
    try {
      const settings = await this.dao.settings.read();
      const connections = (await this.dao.connections.list({ limit: CONNECTION_SCAN_LIMIT, executionTarget: "host" })).items.filter((item) => !item.disabledAt);
      const [runtime, host] = await Promise.all([projectRuntimeLayer(this.deps.gateway), this.hostLayer()]);
      const checkedAt = clock();
      const projection = projectReadiness({ application: projectApplicationLayer(settings), account: projectAccountLayer(connections), runtime, host, checkedAt, now: checkedAt });
      this.lastKnown = projection;
      return projection;
    } catch {
      return this.staleOrUnknown(clock());
    }
  }

  private async hostLayer() {
    return projectHostLayer(await this.deps.host.collect().catch(() => null));
  }

  private staleOrUnknown(now: Date): ReadinessProjection {
    if (this.lastKnown) return { ...this.lastKnown, stale: true };
    return projectReadiness({ application: null, account: null, runtime: null, host: null, checkedAt: now, now });
  }
}
