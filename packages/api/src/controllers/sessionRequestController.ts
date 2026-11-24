import { randomUUID } from "node:crypto";
import type { SessionControlAuthorization } from "../application/services/terminal/sessionControlAuthorization";
import { validatePermissionDecision } from "../application/services/terminal/permissionDecisionValidation";
import { validateQuestionAnswers } from "../application/services/terminal/questionAnswerValidation";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { PermissionDecision, PermissionPayload, QuestionAnswerInput, QuestionPayload, RequestKind } from "../application/terminal/sessionInteraction";
import type { SessionRequestDao, SessionRequestRecord } from "../application/terminal/sessionInteractionPorts";
import type { SessionPrincipal } from "../context";
import { isActiveSession } from "../application/terminal/terminalSessionStatus";
import type { SecretAnswerSender } from "../application/terminal/secretAnswerTransport";

type RequestScope = { projectId: string; taskId: string; requestId: string };
type AnswerQuestionInput = RequestScope & { answers: QuestionAnswerInput };
type DecidePermissionInput = RequestScope & { decision: PermissionDecision; reason?: string };

export type SessionRequestDeps = { control: SessionControlAuthorization; requests: SessionRequestDao; secretAnswers?: SecretAnswerSender; now?: () => Date };

export class SessionRequestController {
  constructor(private readonly deps: SessionRequestDeps) {}

  async answerQuestion(actor: SessionPrincipal, input: AnswerQuestionInput) {
    const request = await this.requireOpen(actor, input, "question");
    const result = validateQuestionAnswers((request.payload as QuestionPayload).questions, input.answers);
    if (!result.ok) throw new TaskError(result.reason);
    if ((request.payload as QuestionPayload).questions.some((question) => question.secret)) return this.answerSecret(actor, request, result.answers);
    return this.answer(actor, request, { answers: result.answers });
  }

  async decidePermission(actor: SessionPrincipal, input: DecidePermissionInput) {
    const request = await this.requireOpen(actor, input, ["permission", "file_change", "extra_permission"]);
    const payload = request.payload as PermissionPayload;
    const suggestedRule = payload.suggestedRule;
    const offers = payload.offers ?? defaultOffers(request.kind);
    const alwaysScope = payload.alwaysScope ?? (request.kind === "permission" ? "project" : null);
    const result = validatePermissionDecision({ decision: input.decision, reason: input.reason, suggestedRule, offers, alwaysScope });
    if (!result.ok) throw new TaskError(result.reason);
    const reason = input.decision === "deny" && input.reason ? input.reason : undefined;
    return this.answer(actor, request, { decision: input.decision, ...(reason ? { reason } : {}) });
  }

  private async requireOpen(actor: SessionPrincipal, input: RequestScope, kind: RequestKind | RequestKind[]) {
    const request = await this.deps.requests.findById(input.requestId);
    if (!request) throw new TaskError("session_control_denied");
    const session = await this.deps.control.requireOwn({ projectId: input.projectId, taskId: input.taskId, sessionId: request.sessionId, actorId: actor.userId });
    this.assertStillOpen(request);
    if (!(Array.isArray(kind) ? kind : [kind]).includes(request.kind)) throw new TaskError("answer_invalid");
    if (session.runtime !== "flow_dev" || !isActiveSession(session.status)) throw new TaskError("session_not_active");
    return request;
  }

  private assertStillOpen(request: Pick<SessionRequestRecord, "status">) {
    if (request.status === "answered") throw new TaskError("request_answered");
    if (request.status === "cancelled") throw new TaskError("request_closed");
  }

  private async answer(actor: SessionPrincipal, request: SessionRequestRecord, answer: unknown) {
    const now = (this.deps.now ?? (() => new Date()))();
    const answered = await this.deps.requests.answerIfPending({ requestId: request.id, answer, answeredBy: actor.userId, at: now });
    if (answered) return { requestId: answered.id, status: answered.status };
    const current = await this.deps.requests.findById(request.id);
    this.assertStillOpen(current ?? { status: "cancelled" });
    throw new TaskError("request_closed");
  }

  private async answerSecret(actor: SessionPrincipal, request: SessionRequestRecord, answers: Record<string, string | string[]>) {
    if (!this.deps.secretAnswers) throw new TaskError("secret_delivery_failed");
    const deliveryId = randomUUID();
    try {
      await this.deps.secretAnswers.deliver({ requestId: request.id, deliveryId, answers, answeredBy: actor.userId, at: (this.deps.now ?? (() => new Date()))().toISOString() });
    } catch {
      // Treat a transport error as an unconfirmed delivery; the database check below resolves a lost acknowledgment.
    }
    const current = await this.deps.requests.findById(request.id);
    const answer = current?.answer as { secretDeliveryId?: unknown } | null;
    if (current?.status === "answered" && answer?.secretDeliveryId === deliveryId) return { requestId: current.id, status: current.status };
    this.assertStillOpen(current ?? { status: "cancelled" });
    throw new TaskError("secret_delivery_failed");
  }
}

function defaultOffers(kind: RequestKind): PermissionDecision[] {
  if (kind === "file_change") return ["allow", "allow_session", "deny"];
  if (kind === "extra_permission") return ["allow", "deny"];
  return ["allow", "allow_always", "deny"];
}
