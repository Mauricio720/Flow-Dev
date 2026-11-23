import type { SessionRequestDao } from "../../terminal/sessionInteractionPorts";
import { INTERRUPTED_BY_PERSON_MESSAGE, denyResult } from "./answerMapper";
import type { PendingRequestRegistry } from "./pendingRequestRegistry";

export type CancellationDeps = { requests: Pick<SessionRequestDao, "cancelPending">; registry: PendingRequestRegistry; now: () => Date };

export class RequestCancellation {
  constructor(private readonly deps: CancellationDeps) {}

  async cancelAll(sessionId: string) {
    const cancelled = await this.deps.requests.cancelPending(sessionId, this.deps.now());
    for (const entry of this.deps.registry.takeAllOf(sessionId)) entry.resolve(denyResult(INTERRUPTED_BY_PERSON_MESSAGE));
    return cancelled;
  }
}
