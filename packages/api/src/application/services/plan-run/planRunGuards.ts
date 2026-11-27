import type { ExecutionPlanDao } from "../../database/dao/executionPlanDao";
import type { IssueClaimDao } from "../../database/dao/issueClaimDao";
import type { PlanRunRecord } from "../../database/dao/planRunDao";
import type { TerminalSessionDao } from "../../database/dao/terminalSessionDao";
import { planFolderChanged } from "../tasks-set/planReconciliation";
import type { StoredPlan } from "../tasks-set/planTypes";
import type { TaskSetLoader } from "../tasks-set/taskSetLoader";
import type { TaskSet } from "../tasks-set/taskSetTypes";
import type { PlanRunPause, PlanRunPauser } from "./planRunPauser";

export type PlanRunGuardsDeps = { claims: Pick<IssueClaimDao, "claimByTask">; planning: Pick<TerminalSessionDao, "approvedPlanning">; plans: Pick<ExecutionPlanDao, "find">; loader: Pick<TaskSetLoader, "load">; pauser: Pick<PlanRunPauser, "pause"> };
export type GuardedRun = { plan: StoredPlan; set: TaskSet };

const CLAIM_LOST = "A operadora da feature mudou.";
const PLANNING_NOT_APPROVED = "O planejamento não está mais aprovado.";
const TASK_SET_UNREADABLE = "O conjunto de tarefas não pode ser lido.";
const FOLDER_CHANGED = "A pasta das tarefas mudou. Revise o plano.";
const CLAIMED_STATE = "claimed";

export class PlanRunGuards {
  constructor(private readonly deps: PlanRunGuardsDeps) {}

  async check(run: PlanRunRecord): Promise<GuardedRun | null> {
    const outcome = await this.evaluate(run);
    if ("plan" in outcome) return outcome;
    await this.deps.pauser.pause(run, outcome);
    return null;
  }

  private async evaluate(run: PlanRunRecord): Promise<GuardedRun | PlanRunPause> {
    const claim = await this.deps.claims.claimByTask(run.projectId, run.taskId);
    if (claim?.state !== CLAIMED_STATE || claim.operatorUserId !== run.startedBy) return { code: "claim_lost", reason: CLAIM_LOST, itemId: null };
    if (!(await this.deps.planning.approvedPlanning(run.taskId))) return { code: "planning_not_approved", reason: PLANNING_NOT_APPROVED, itemId: null };
    const [plan, set] = await Promise.all([this.deps.plans.find(run.taskId), this.deps.loader.load(run.taskId)]);
    if (!plan || !set || set.problem !== null) return { code: "task_set_unreadable", reason: TASK_SET_UNREADABLE, itemId: null };
    if (planFolderChanged(plan, set)) return { code: "folder_changed", reason: FOLDER_CHANGED, itemId: null };
    return { plan, set };
  }
}
