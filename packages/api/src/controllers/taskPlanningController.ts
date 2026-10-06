import type { TaskDao } from "../application/database/dao/taskDao";
import type { ReadyPlacementService } from "../application/services/projects/readyPlacementService";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import type { PlanningRoute } from "../application/services/tasks/planningContracts";
import type { PlanningService } from "../application/services/tasks/planningService";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { SessionPrincipal } from "../context";
import { requirePlanningConfiguration } from "./planningInputGuard";
import { finishPlanningCommand, logReadyPlacement, logReadyPlacementFailure } from "./planningEvents";

type Scope = { projectId: string; taskId: string };
type Command = Scope & { requestKey: string; expectedVersion: number };
type Review = Command & { decisionId: string; expectedDecisionVersion: number };

export class TaskPlanningController {
  constructor(private readonly tasks: TaskDao, private readonly planning: PlanningService, private readonly repositories: RepositoryAccessService, private readonly configuration: () => void = requirePlanningConfiguration, private readonly ready?: ReadyPlacementService) {}

  async start(actor: SessionPrincipal, input: Command) {
    await this.requireAuthor(actor, input);
    const result = await this.planning.start({ ...input, actorUserId: actor.userId, sessionId: requireSession(actor), beforeAccept: this.configuration });
    return finishPlanningCommand("planning.accepted", input.requestKey, result);
  }

  async retry(actor: SessionPrincipal, input: Command & { failedOperationId: string }) {
    await this.requireAuthor(actor, input);
    const result = await this.planning.retry({ ...input, actorUserId: actor.userId, sessionId: requireSession(actor), beforeAccept: this.configuration });
    return finishPlanningCommand("planning.accepted", input.requestKey, result);
  }

  async selectRoute(actor: SessionPrincipal, input: Review & { selectedRoute: PlanningRoute }) {
    await this.requireAuthor(actor, input);
    const result = await this.planning.selectRoute({ ...input, actorUserId: actor.userId });
    return finishPlanningCommand("planning.route_saved", input.requestKey, result);
  }

  async approve(actor: SessionPrincipal, input: Review & { reviewedRoute: PlanningRoute }) {
    await this.requireAuthor(actor, input);
    const result = await this.planning.approve({ ...input, actorUserId: actor.userId });
    await this.moveToReady(actor, input);
    return finishPlanningCommand("planning.approved", input.requestKey, result);
  }

  private async moveToReady(actor: SessionPrincipal, scope: Scope) {
    if (!this.ready) return;
    try {
      const issueNodeId = await this.planning.publishedIssueNodeId(scope.taskId);
      if (!issueNodeId) return;
      const { token } = await this.repositories.contextCredentials(actor, scope.projectId);
      logReadyPlacement(scope.taskId, await this.ready.move({ projectId: scope.projectId, token, issueNodeId }));
    } catch (error) { logReadyPlacementFailure(scope.taskId, error); }
  }

  async submission(actor: SessionPrincipal, input: Scope & { action: string; requestKey: string }) {
    await this.requireAuthor(actor, input);
    return this.planning.submission({ ...input, actorUserId: actor.userId });
  }

  private async requireAuthor(actor: SessionPrincipal, input: Scope) {
    await this.repositories.requireRead(actor, input.projectId);
    const task = await this.tasks.findScoped(input.projectId, input.taskId);
    if (!task) throw new TaskError("task_unavailable");
    if (task.authorUserId !== actor.userId) throw new TaskError("author_required");
  }
}

function requireSession(actor: SessionPrincipal) {
  if (!actor.sessionId) throw new TaskError("session_required");
  return actor.sessionId;
}
