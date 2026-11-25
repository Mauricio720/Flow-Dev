import type { TaskSetReadDao } from "../application/database/dao/taskSetReadDao";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { ProjectUnavailableError } from "../application/services/access/projectAccessService";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { ReadAccessGate } from "../application/services/projects/readAccessGate";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { ReviewCycleService } from "../application/services/review/reviewCycleService";
import type { ReviewAction } from "../application/services/review/reviewCycleTypes";
import type { SessionPrincipal } from "../context";

export type ReviewScope = { projectId: string; taskId: string };
export type ReviewStartRequest = Omit<import("../application/services/review/reviewCycleService").ReviewStartInput, "actorId">;
export type ReviewRequest = ReviewScope & { cycleId: string; revision: number; action: ReviewAction };
export type ReviewCycleControllerDeps = { service: Pick<ReviewCycleService, "get" | "start" | "request">; repositories: Pick<RepositoryAccessService, "requireRead">; tasks: Pick<TaskSetReadDao, "taskInProject">; authorization: Pick<WorkAuthorization, "requireOperate">; now?: () => Date };

export class ReviewCycleController {
  private readonly gate: ReadAccessGate;
  private readonly now: () => Date;
  constructor(private readonly deps: ReviewCycleControllerDeps) {
    this.gate = new ReadAccessGate(deps.repositories);
    this.now = deps.now ?? (() => new Date());
  }

  async get(actor: SessionPrincipal, input: ReviewScope) {
    await this.requireReadTask(actor, input);
    return this.deps.service.get({ taskId: input.taskId });
  }

  async start(actor: SessionPrincipal, input: ReviewStartRequest) {
    await this.deps.authorization.requireOperate({ projectId: input.projectId, taskId: input.taskId, actorId: actor.userId });
    return this.deps.service.start({ ...input, actorId: actor.userId });
  }

  async request(actor: SessionPrincipal, input: ReviewRequest) {
    await this.deps.authorization.requireOperate({ projectId: input.projectId, taskId: input.taskId, actorId: actor.userId });
    return this.deps.service.request({ taskId: input.taskId, cycleId: input.cycleId, revision: input.revision, action: input.action, by: actor.userId, at: this.now() });
  }

  private async requireReadTask(actor: SessionPrincipal, input: ReviewScope) {
    try { await this.gate.require(actor, input.projectId); } catch (error) { if (error instanceof ProjectUnavailableError) throw new TaskError("access_revoked", undefined, error); throw error; }
    if (!(await this.deps.tasks.taskInProject(input.projectId, input.taskId))) throw new TaskError("task_unavailable");
  }
}
