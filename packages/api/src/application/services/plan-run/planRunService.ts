import type { ExecutionPlanDao } from "../../database/dao/executionPlanDao";
import type { PlanRunDao, PlanRunRecord } from "../../database/dao/planRunDao";
import type { ProjectRecord } from "../../database/dao/projectDao";
import { repositoryOf } from "../projects/localCheckoutService";
import type { TerminalOpenGuard } from "../terminal/terminalOpenGuard";
import { TaskError } from "../tasks/taskErrors";
import type { PlanLog } from "../tasks-set/planLog";
import { buildPlanView } from "../tasks-set/planView";
import type { TaskSetLoader } from "../tasks-set/taskSetLoader";
import { createRun } from "./planRunCreation";
import { requireFilledSessions, requireNoActiveRun, requireRevision, requireSessionToStart } from "./planRunStartChecks";
import { planRunView } from "./planRunView";

export type PlanRunStartInput = { projectId: string; taskId: string; actorId: string; requestKey: string };
export type PlanRunChangeInput = { taskId: string; actorId: string; revision: number };
export type PlanRunServiceDeps = { plans: Pick<ExecutionPlanDao, "find">; runs: PlanRunDao; loader: Pick<TaskSetLoader, "load">; projects: { findById(projectId: string): Promise<ProjectRecord | null> }; guard: Pick<TerminalOpenGuard, "assertServiceRunning" | "requireCheckout" | "assertSkills">; hostId: string; log: PlanLog };

export class PlanRunService {
  constructor(private readonly deps: PlanRunServiceDeps) {}

  async start(input: PlanRunStartInput) {
    const existing = await this.deps.runs.findByRequestKey(input.actorId, input.requestKey);
    if (existing) return planRunView(existing)!;
    const plan = await this.startablePlan(input.taskId);
    const current = await this.deps.runs.findByPlan(plan.id);
    requireNoActiveRun(current);
    await this.preflight(input);
    const run = await createRun(this.deps, { planId: plan.id, current, input });
    this.deps.log.runStarted({ taskId: input.taskId, runId: run.id, resumeCount: run.resumeCount });
    return planRunView(run)!;
  }

  async pause(input: PlanRunChangeInput) {
    const run = await this.runOf(input.taskId);
    if (run?.state === "paused") return planRunView(run)!;
    const current = requireRevision(run, input.revision);
    if (current.state !== "running") throw new TaskError("plan_run_state");
    const paused = await this.deps.runs.transition({ runId: current.id, revision: current.revision, next: { state: "paused", pausedBy: input.actorId, pauseReason: null } });
    this.deps.log.runPaused({ taskId: input.taskId, runId: current.id, reason: "operator", item: current.currentItemId });
    return this.changed(paused);
  }

  async resume(input: PlanRunChangeInput) {
    const run = await this.runOf(input.taskId);
    if (run?.state === "running") return planRunView(run)!;
    const current = requireRevision(run, input.revision);
    if (current.state !== "paused") throw new TaskError("plan_run_state");
    const next = { state: "running" as const, startedBy: input.actorId, pausedBy: null, pauseReason: null, currentItemId: null, currentSessionId: null, resumeCount: current.resumeCount + 1 };
    const resumed = await this.deps.runs.transition({ runId: current.id, revision: current.revision, next });
    this.deps.log.runResumed({ taskId: input.taskId, runId: current.id, resumeCount: next.resumeCount });
    return this.changed(resumed);
  }

  private async startablePlan(taskId: string) {
    const [plan, set] = await Promise.all([this.deps.plans.find(taskId), this.deps.loader.load(taskId)]);
    if (!set || set.problem !== null) throw new TaskError("task_set_unavailable");
    if (!plan) throw new TaskError("plan_run_nothing_to_start");
    const { items } = buildPlanView({ plan, set, canEdit: false, agents: [] });
    requireFilledSessions(items);
    requireSessionToStart(items);
    return plan;
  }

  private async preflight(input: PlanRunStartInput) {
    await this.deps.guard.assertServiceRunning();
    const project = await this.deps.projects.findById(input.projectId);
    if (!project) throw new TaskError("project_unavailable");
    await this.deps.guard.requireCheckout({ userId: input.actorId, projectId: input.projectId, repository: repositoryOf(project) });
    await this.deps.guard.assertSkills();
  }

  private async runOf(taskId: string) {
    const plan = await this.deps.plans.find(taskId);
    return plan ? this.deps.runs.findByPlan(plan.id) : null;
  }

  private changed(run: PlanRunRecord | null) {
    if (!run) throw new TaskError("plan_run_state");
    return planRunView(run)!;
  }
}
