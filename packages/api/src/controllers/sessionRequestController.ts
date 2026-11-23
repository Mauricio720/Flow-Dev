import type { SessionControlAuthorization } from "../application/services/terminal/sessionControlAuthorization";
import { validatePermissionDecision } from "../application/services/terminal/permissionDecisionValidation";
import { validateQuestionAnswers } from "../application/services/terminal/questionAnswerValidation";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { PermissionDecision, PermissionPayload, QuestionAnswerInput, QuestionPayload, RequestKind } from "../application/terminal/sessionInteraction";
import type { SessionRequestDao, SessionRequestRecord } from "../application/terminal/sessionInteractionPorts";
import type { SessionPrincipal } from "../context";

type RequestScope = { projectId: string; taskId: string; requestId: string };
type AnswerQuestionInput = RequestScope & { answers: QuestionAnswerInput };
type DecidePermissionInput = RequestScope & { decision: PermissionDecision; reason?: string };

export type SessionRequestDeps = { control: SessionControlAuthorization; requests: SessionRequestDao; now?: () => Date };

export class SessionRequestController {
  constructor(private readonly deps: SessionRequestDeps) {}

  async answerQuestion(actor: SessionPrincipal, input: AnswerQuestionInput) {
    const request = await this.requireOpen(actor, input, "question");
    const result = validateQuestionAnswers((request.payload as QuestionPayload).questions, input.answers);
    if (!result.ok) throw new TaskError(result.reason);
    return this.answer(actor, request, { answers: result.answers });
  }

  async decidePermission(actor: SessionPrincipal, input: DecidePermissionInput) {
    const request = await this.requireOpen(actor, input, "permission");
    const suggestedRule = (request.payload as PermissionPayload).suggestedRule;
    const result = validatePermissionDecision({ decision: input.decision, reason: input.reason, suggestedRule });
    if (!result.ok) throw new TaskError(result.reason);
    const reason = input.decision === "deny" && input.reason ? input.reason : undefined;
    return this.answer(actor, request, { decision: input.decision, ...(reason ? { reason } : {}) });
  }

  private async requireOpen(actor: SessionPrincipal, input: RequestScope, kind: RequestKind) {
    const request = await this.deps.requests.findById(input.requestId);
    if (!request) throw new TaskError("session_control_denied");
    await this.deps.control.requireOwn({ projectId: input.projectId, taskId: input.taskId, sessionId: request.sessionId, actorId: actor.userId });
    this.assertStillOpen(request);
    if (request.kind !== kind) throw new TaskError("answer_invalid");
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
}
