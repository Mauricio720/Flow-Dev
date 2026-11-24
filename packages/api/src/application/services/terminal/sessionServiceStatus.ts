import type { SessionHostDao } from "../../terminal/sessionInteractionPorts";
import type { CodexStatus } from "../../terminal/codexCatalog";

export const SERVICE_HEARTBEAT_FRESH_MS = 15_000;

export interface SessionServiceStatus {
  running(): Promise<boolean>;
}

export interface SessionCatalogStatus extends SessionServiceStatus {
  codexStatus(): Promise<CodexStatus | null>;
}

export type SessionServiceStatusDeps = { hosts: SessionHostDao; hostId: string; now: () => Date };

export class HeartbeatSessionServiceStatus implements SessionCatalogStatus {
  constructor(private readonly deps: SessionServiceStatusDeps) {}

  async running(): Promise<boolean> {
    const beat = await this.deps.hosts.lastBeat(this.deps.hostId);
    if (!beat) return false;
    return this.deps.now().getTime() - beat.heartbeatAt.getTime() < SERVICE_HEARTBEAT_FRESH_MS;
  }

  codexStatus() {
    return this.deps.hosts.codexStatus(this.deps.hostId);
  }
}
