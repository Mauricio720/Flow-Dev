import type { ExecutionPlanDao } from "../../database/dao/executionPlanDao";
import { choiceProblem, modelUnavailableMessage } from "../../terminal/sessionAgentCatalog";
import type { SessionAgent } from "../../terminal/sessionAgentCatalog";
import { TaskError } from "../tasks/taskErrors";
import type { PlanLog } from "./planLog";
import { validatePlan } from "./planRules";
import type { PlanItemDraft, StoredPlan, StoredPlanItem } from "./planTypes";
import { planFolderChanged, reconcilePlan } from "./planReconciliation";
import type { TaskSetLoader } from "./taskSetLoader";
import type { TaskSet } from "./taskSetTypes";
import type { SessionCatalogStatus } from "../terminal/sessionServiceStatus";
import type { CodexStatus } from "../../terminal/codexCatalog";

export type PlanSaveDeps = { plans: ExecutionPlanDao; loader: Pick<TaskSetLoader, "load">; agents: ReadonlySet<SessionAgent>; log: PlanLog; catalog?: SessionCatalogStatus };
export type PlanSaveRequest = { taskId: string; actorId: string; version: number; items: PlanItemDraft[] };

function sameChoice(left: StoredPlanItem["choice"], right: PlanItemDraft["choice"]) {
  return left.agent === right.agent && left.model === right.model && left.effort === right.effort;
}

export class PlanSaveService {
  constructor(private readonly deps: PlanSaveDeps) {}

  async save(request: PlanSaveRequest): Promise<{ version: number }> {
    const set = await this.deps.loader.load(request.taskId);
    if (!set || set.problem !== null) throw new TaskError("task_set_unavailable");
    const plan = await this.deps.plans.find(request.taskId);
    this.requireVersion(request, plan);
    const resetItems = plan !== null && planFolderChanged(plan, set);
    const items = await this.validated(set, resetItems ? null : plan, request.items);
    const result = await this.deps.plans.save({ taskId: request.taskId, actorId: request.actorId, version: request.version, tasksFolder: set.folder, manifestVersion: set.manifestVersion, resetItems, items });
    if (result === "conflict") throw this.conflict(request, plan?.version ?? 0);
    this.deps.log.saved({ task: request.taskId, version: result.version, sessions: items.length, tasks: items.flatMap((item) => item.taskIds).length, reset: resetItems });
    return result;
  }

  private requireVersion(request: PlanSaveRequest, plan: StoredPlan | null) {
    const current = plan?.version ?? 0;
    if (current !== request.version) throw this.conflict(request, current);
  }

  private conflict(request: PlanSaveRequest, current: number) {
    this.deps.log.conflict({ task: request.taskId, expected: request.version, current });
    return new TaskError("plan_conflict");
  }

  private async validated(set: TaskSet, plan: StoredPlan | null, drafts: PlanItemDraft[]) {
    const stored = plan ? reconcilePlan(plan, set).items : [];
    const outcome = validatePlan({ set, stored, drafts });
    if ("error" in outcome) throw new TaskError(outcome.error, outcome.message ? { message: outcome.message } : undefined);
    const catalog = await this.deps.catalog?.codexStatus();
    for (const item of outcome.items) this.requireChoice(item, stored, catalog);
    return outcome.items;
  }

  private requireChoice(item: PlanItemDraft, stored: StoredPlanItem[], catalog: CodexStatus | null | undefined) {
    const current = stored.find((candidate) => candidate.id === item.id);
    if (current && sameChoice(current.choice, item.choice)) return;
    if (item.choice.agent === "codex" && this.deps.catalog && !catalog) throw new TaskError("agent_unavailable", { message: "O catálogo do Codex ainda não foi publicado." });
    const problem = choiceProblem(item.choice, this.deps.agents, catalog);
    if (problem) {
      const message = problem === "model_unavailable" ? modelUnavailableMessage(item.choice.model) : item.choice.agent === "codex" ? catalog?.reason : undefined;
      throw new TaskError(problem, message ? { message } : undefined);
    }
  }
}
