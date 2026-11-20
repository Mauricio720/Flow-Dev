import type { SessionPrincipal } from "../context";
import type { AccessDao } from "../application/database/dao/accessDao";
import { AssignedIssueError } from "../application/services/assigned-issues/assignedIssueErrors";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import type { ExecutionCancelService } from "../application/services/execution/executionCancelService";
import type { ExecutionStartService } from "../application/services/execution/executionStartService";
import type { ExecutionStatusService } from "../application/services/execution/executionStatusService";
import { TaskError } from "../application/services/tasks/taskErrors";
import { executionStatusDto } from "./mappers/executionDtoMapper";

type Scope = { projectId: string; taskId: string };
type StartInput = Scope & { decisionId: string; expectedDecisionVersion: number; idempotencyKey: string };
type CancelInput = Scope & { executionId: string; idempotencyKey: string };
type ControllerDeps = { start: ExecutionStartService; status: ExecutionStatusService; cancel: ExecutionCancelService; authorization: WorkAuthorization; permissions: Pick<AccessDao, "isAdmin"> };
const CLAIM_REASONS = ["operator_required", "claim_unresolved"];

export class TaskExecutionController {
  constructor(private readonly deps: ControllerDeps) {}

  async status(actor: SessionPrincipal, input: Scope) {
    await this.deps.authorization.requireRead({ ...input, actorId: actor.userId });
    return executionStatusDto(await this.deps.status.status({ ...input, actorId: actor.userId }));
  }

  async start(actor: SessionPrincipal, input: StartInput) {
    const claimed = await this.operatorStanding(actor, input);
    return this.deps.start.start({ ...input, actorId: actor.userId, claimed });
  }

  async cancel(actor: SessionPrincipal, input: CancelInput) {
    await this.deps.authorization.requireRead({ ...input, actorId: actor.userId });
    if (!(await this.deps.permissions.isAdmin(actor.userId)) && !(await this.operatorStanding(actor, input))) throw new TaskError("claim_required");
    return this.deps.cancel.cancel({ taskId: input.taskId, executionId: input.executionId });
  }

  private async operatorStanding(actor: SessionPrincipal, scope: Scope) {
    const assessment = await this.deps.authorization.assess({ ...scope, actorId: actor.userId }, true);
    if (!assessment.reason) return true;
    if (CLAIM_REASONS.includes(assessment.reason)) return false;
    throw new AssignedIssueError(assessment.reason);
  }
}
