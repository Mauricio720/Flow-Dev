import type { SessionRequestDao } from "../../terminal/sessionInteractionPorts";
import { INTERRUPTED_BY_PERSON_MESSAGE, denyResult } from "./answerMapper";
import type { PendingRequestRegistry } from "./pendingRequestRegistry";
import type { SessionRequestGate } from "./sessionRequestGate";

export type CancellationDeps = { requests: Pick<SessionRequestDao, "cancelPending" | "pendingIds">; registry: PendingRequestRegistry; gate: SessionRequestGate; now: () => Date };

export class RequestCancellation {
  constructor(private readonly deps: CancellationDeps) {}

  async cancelAll(sessionId: string) {
    return this.deps.gate.run(sessionId, async () => {
      const cancelled = await this.deps.requests.cancelPending(sessionId, this.deps.now());
      for (const entry of this.deps.registry.takeAllOf(sessionId)) entry.resolve(denyResult(INTERRUPTED_BY_PERSON_MESSAGE));
      return cancelled;
    });
  }

  pendingIds(sessionId: string) { return this.deps.requests.pendingIds(sessionId); }
}
