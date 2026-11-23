import type { HeartbeatStep } from "./heartbeatStep";
import { errorFields, type SessionLog } from "./sessionLog";
import type { TickStep } from "./sessionTickStep";

export type SupervisorDeps = { heartbeat: HeartbeatStep; steps: TickStep[]; log: SessionLog };

export class SessionSupervisor {
  constructor(private readonly deps: SupervisorDeps) {}

  beat() {
    return this.deps.heartbeat.beat();
  }

  async tick() {
    for (const step of [this.deps.heartbeat, ...this.deps.steps]) {
      try {
        await step.run();
      } catch (error) {
        this.deps.log.error("step_failed", { step: step.name, ...errorFields(error) });
      }
    }
  }
}
