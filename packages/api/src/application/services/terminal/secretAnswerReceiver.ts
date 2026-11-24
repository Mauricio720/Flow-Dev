import type { SessionRequestDao, SessionRequestRecord } from "../../terminal/sessionInteractionPorts";
import { SECRET_ANSWER_HIDDEN, type SecretAnswerDelivery } from "../../terminal/secretAnswerTransport";
import type { SessionStatusDao } from "../../terminal/sessionStatusPorts";
import type { PendingRequestRegistry } from "./pendingRequestRegistry";
import { mapAnswerToPermissionResult } from "./answerMapper";
import type { SessionRequestGate } from "./sessionRequestGate";
import type { QuestionPayload } from "../../terminal/sessionInteraction";

export type SecretAnswerReceiverDeps = { requests: Pick<SessionRequestDao, "findById" | "answerIfPending" | "pendingIds">; status: Pick<SessionStatusDao, "transition">; registry: PendingRequestRegistry; gate: SessionRequestGate };

export class SecretAnswerReceiver {
  constructor(private readonly deps: SecretAnswerReceiverDeps) {}

  async receive(delivery: SecretAnswerDelivery): Promise<boolean> {
    const found = await this.deps.requests.findById(delivery.requestId);
    if (!found || found.status !== "pending") return false;
    return this.deps.gate.run(found.sessionId, () => this.answerPending(found, delivery));
  }

  private async answerPending(found: SessionRequestRecord, delivery: SecretAnswerDelivery) {
    const request = await this.deps.requests.findById(found.id);
    if (!request || request.status !== "pending" || request.kind !== "question" || !this.deps.registry.ids().includes(request.id)) return false;
    const questions = (request.payload as QuestionPayload).questions;
    const secretIds = questions.filter((question) => question.secret).map((question) => question.id ?? question.question);
    if (secretIds.length === 0 || !sameKeys(questions.map((question) => question.id ?? question.question), delivery.answers)) return false;
    const storedAnswers = { ...delivery.answers, ...Object.fromEntries(secretIds.map((id) => [id, SECRET_ANSWER_HIDDEN])) };
    const answer = { answers: storedAnswers, secretDeliveryId: delivery.deliveryId };
    const saved = await this.deps.requests.answerIfPending({ requestId: request.id, answer, answeredBy: delivery.answeredBy, at: new Date(delivery.at) });
    if (!saved) return false;
    const entry = this.deps.registry.take(request.id);
    if (!entry) return false;
    entry.resolve(mapAnswerToPermissionResult(request, { answers: delivery.answers }, entry.input));
    if ((await this.deps.requests.pendingIds(request.sessionId)).length === 0) await this.deps.status.transition(request.sessionId, "requests_settled");
    return true;
  }
}

function sameKeys(keys: string[], answers: Record<string, string | string[]>): boolean {
  const actual = Object.keys(answers);
  return keys.length === actual.length && new Set(keys).size === keys.length && keys.every((key) => Object.hasOwn(answers, key));
}
