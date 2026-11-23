import type { SessionRequestDao } from "../../terminal/sessionInteractionPorts";
import type { SessionStatusDao } from "../../terminal/sessionStatusPorts";
import { mapAnswerToPermissionResult } from "./answerMapper";
import type { PendingRequestRegistry } from "./pendingRequestRegistry";
import type { SessionLog } from "./sessionLog";
import type { TickStep } from "./sessionTickStep";

export type AnswerDispatchDeps = { requests: Pick<SessionRequestDao, "listAnsweredFor" | "pendingIds">; status: Pick<SessionStatusDao, "transition">; registry: PendingRequestRegistry; log: SessionLog };

export class AnswerDispatchStep implements TickStep {
  readonly name = "answers";

  constructor(private readonly deps: AnswerDispatchDeps) {}

  async run() {
    const answered = await this.deps.requests.listAnsweredFor(this.deps.registry.ids());
    for (const request of answered) {
      const entry = this.deps.registry.take(request.id);
      if (!entry) continue;
      entry.resolve(mapAnswerToPermissionResult(request, request.answer, entry.input));
      this.deps.log.info("request_answered", { sessionId: request.sessionId, kind: request.kind });
      if ((await this.deps.requests.pendingIds(request.sessionId)).length === 0) await this.deps.status.transition(request.sessionId, "requests_settled");
    }
  }
}
