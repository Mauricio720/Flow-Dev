import type { SessionHostDao } from "../../terminal/sessionInteractionPorts";
import type { TickStep } from "./sessionTickStep";

export const HEARTBEAT_INTERVAL_MS = 5_000;

export type HeartbeatDeps = { hosts: SessionHostDao; hostId: string; workerId: string; now: () => Date };

export class HeartbeatStep implements TickStep {
  readonly name = "heartbeat";
  private lastBeatAt = 0;

  constructor(private readonly deps: HeartbeatDeps) {}

  async beat() {
    const at = this.deps.now();
    await this.deps.hosts.beat({ hostId: this.deps.hostId, workerId: this.deps.workerId, heartbeatAt: at });
    this.lastBeatAt = at.getTime();
  }

  async run() {
    if (this.deps.now().getTime() - this.lastBeatAt >= HEARTBEAT_INTERVAL_MS) await this.beat();
  }
}
