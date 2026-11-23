import type { SessionMessageDao } from "../../terminal/sessionInteractionPorts";
import type { SessionHandleRegistry } from "./sessionHandleRegistry";
import type { SessionLog } from "./sessionLog";
import type { TickStep } from "./sessionTickStep";

export type DeliveryDeps = { registry: SessionHandleRegistry; messages: Pick<SessionMessageDao, "listUndelivered" | "markDelivered">; now: () => Date; log: SessionLog };

export class MessageDeliveryStep implements TickStep {
  readonly name = "delivery";

  constructor(private readonly deps: DeliveryDeps) {}

  async run() {
    for (const sessionId of this.deps.registry.ids()) {
      const queued = await this.deps.messages.listUndelivered(sessionId);
      const handle = this.deps.registry.get(sessionId);
      if (queued.length === 0 || !handle) continue;
      for (const message of queued) handle.push(message.content);
      await this.deps.messages.markDelivered(queued.map((message) => message.id), this.deps.now());
      this.deps.log.info("delivered", { sessionId, count: queued.length });
    }
  }
}
