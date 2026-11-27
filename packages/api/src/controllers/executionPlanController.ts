import type { ExecutionPlanDao } from "../application/database/dao/executionPlanDao";
import type { PlanRunDao } from "../application/database/dao/planRunDao";
import { planRunView } from "../application/services/plan-run/planRunView";
import type { IssueClaimDao } from "../application/database/dao/issueClaimDao";
import type { TaskSetReadDao } from "../application/database/dao/taskSetReadDao";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { ReadAccessGate } from "../application/services/projects/readAccessGate";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { TaskError } from "../application/services/tasks/taskErrors";
import { requirePlanOperator } from "../application/services/tasks-set/planAuthorization";
import type { PlanLog } from "../application/services/tasks-set/planLog";
import { PlanSaveService } from "../application/services/tasks-set/planSaveService";
import type { PlanItemDraft } from "../application/services/tasks-set/planTypes";
import { buildPlanView } from "../application/services/tasks-set/planView";
import type { TaskSetLoader } from "../application/services/tasks-set/taskSetLoader";
import { agentAvailability, publishedAgentAvailability, type SessionAgent } from "../application/terminal/sessionAgentCatalog";
import type { SessionPrincipal } from "../context";
import type { SessionCatalogStatus } from "../application/services/terminal/sessionServiceStatus";

export type ExecutionPlanDeps = {
  plans: ExecutionPlanDao;
  taskSets: Pick<TaskSetReadDao, "taskInProject">;
  loader: Pick<TaskSetLoader, "load">;
  repositories: Pick<RepositoryAccessService, "requireRead">;
  claims: Pick<IssueClaimDao, "claimByTask">;
  authorization: Pick<WorkAuthorization, "requireOperate">;
  agents: ReadonlySet<SessionAgent>;
  catalog?: SessionCatalogStatus;
  runs?: Pick<PlanRunDao, "findByPlan">;
  log: PlanLog;
};

export type PlanScope = { projectId: string; taskId: string };
export type PlanSaveInput = PlanScope & { version: number; items: PlanItemDraft[] };

export class ExecutionPlanController {
  private readonly gate: ReadAccessGate;
  private readonly saver: PlanSaveService;

  constructor(private readonly deps: ExecutionPlanDeps) {
    this.gate = new ReadAccessGate(deps.repositories);
    this.saver = new PlanSaveService({ plans: deps.plans, loader: deps.loader, agents: deps.agents, log: deps.log, catalog: deps.catalog });
  }

  async get(actor: SessionPrincipal, input: PlanScope) {
    await this.requireTask(actor, input);
    const [plan, set, canEdit] = await Promise.all([this.deps.plans.find(input.taskId), this.deps.loader.load(input.taskId), this.canEdit(actor, input)]);
    const status = this.deps.catalog ? await this.deps.catalog.codexStatus(input.taskId) : null;
    const running = this.deps.catalog ? await this.deps.catalog.running() : true;
    const agents = this.deps.catalog ? publishedAgentAvailability(this.deps.agents, status, running) : agentAvailability(this.deps.agents);
    const run = plan && this.deps.runs ? await this.deps.runs.findByPlan(plan.id) : null;
    return buildPlanView({ plan, set, canEdit, agents, run: planRunView(run) });
  }

  async save(actor: SessionPrincipal, input: PlanSaveInput) {
    await this.requireTask(actor, input);
    await requirePlanOperator(this.deps.authorization, { projectId: input.projectId, taskId: input.taskId, actorId: actor.userId });
    return this.saver.save({ taskId: input.taskId, actorId: actor.userId, version: input.version, items: input.items });
  }

  private async requireTask(actor: SessionPrincipal, input: PlanScope) {
    await this.gate.require(actor, input.projectId);
    if (!(await this.deps.taskSets.taskInProject(input.projectId, input.taskId))) throw new TaskError("task_unavailable");
  }

  private async canEdit(actor: SessionPrincipal, input: PlanScope) {
    const claim = await this.deps.claims.claimByTask(input.projectId, input.taskId);
    return claim?.state === "claimed" && claim.operatorUserId === actor.userId;
  }
}
