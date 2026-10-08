import type { PlanningRoute } from "../application/services/tasks/planningContracts";
import type { PlanningService } from "../application/services/tasks/planningService";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { SessionPrincipal } from "../context";
import { requirePlanningConfiguration } from "./planningInputGuard";
import { finishPlanningCommand } from "./planningEvents";

type Scope = { projectId: string; taskId: string };
type Command = Scope & { requestKey: string; expectedVersion: number };
type Review = Command & { decisionId: string; expectedDecisionVersion: number };

export class TaskPlanningController {
  constructor(private readonly planning: PlanningService, private readonly authorization: WorkAuthorization, private readonly configuration: () => void = requirePlanningConfiguration) {}

  async start(actor: SessionPrincipal, input: Command) {
    await this.requireOperator(actor, input);
    const result = await this.planning.start({ ...input, actorUserId: actor.userId, sessionId: requireSession(actor), beforeAccept: this.configuration });
    return finishPlanningCommand("planning.accepted", input.requestKey, result);
  }

  async retry(actor: SessionPrincipal, input: Command & { failedOperationId: string }) {
    await this.requireOperator(actor, input);
    const result = await this.planning.retry({ ...input, actorUserId: actor.userId, sessionId: requireSession(actor), beforeAccept: this.configuration });
    return finishPlanningCommand("planning.accepted", input.requestKey, result);
  }

  async selectRoute(actor: SessionPrincipal, input: Review & { selectedRoute: PlanningRoute }) {
    await this.requireOperator(actor, input);
    const result = await this.planning.selectRoute({ ...input, actorUserId: actor.userId });
    return finishPlanningCommand("planning.route_saved", input.requestKey, result);
  }

  async approve(actor: SessionPrincipal, input: Review & { reviewedRoute: PlanningRoute }) {
    await this.requireOperator(actor, input);
    const result = await this.planning.approve({ ...input, actorUserId: actor.userId });
    return finishPlanningCommand("planning.approved", input.requestKey, result);
  }

  async submission(actor: SessionPrincipal, input: Scope & { action: string; requestKey: string }) {
    await this.authorization.requireRead({ ...input, actorId: actor.userId });
    return this.planning.submission({ ...input, actorUserId: actor.userId });
  }

  private requireOperator(actor: SessionPrincipal, scope: Scope) {
    return this.authorization.requireOperate({ projectId: scope.projectId, taskId: scope.taskId, actorId: actor.userId }, { currentSource: true });
  }
}

function requireSession(actor: SessionPrincipal) {
  if (!actor.sessionId) throw new TaskError("session_required");
  return actor.sessionId;
}
