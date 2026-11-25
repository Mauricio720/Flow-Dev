import type { NewReviewCycle, ReviewCycleDao } from "../../database/dao/reviewCycleDao";
import type { ProjectRecord } from "../../database/dao/projectDao";
import type { TerminalExecutionDao } from "../../database/dao/terminalExecutionDao";
import type { TaskSetLoader } from "../tasks-set/taskSetLoader";
import { isActiveSession } from "../../terminal/terminalSessionStatus";
import { publishedAgentAvailability, type AgentChoice, type SessionAgent } from "../../terminal/sessionAgentCatalog";
import type { SessionCatalogStatus } from "../terminal/sessionServiceStatus";
import type { ReviewCycleView, ReviewGetView } from "./reviewCycleView";
import { reviewDefaults } from "./reviewDefaults";
import { repositoryOf } from "../projects/localCheckoutService";
import type { TerminalOpenGuard } from "../terminal/terminalOpenGuard";
import { TaskError } from "../tasks/taskErrors";
import { requireCompleteTasks, requireNoActiveCycle, requireNoOpenSessions, requireReadableTaskSet, requireReviewChoices } from "./reviewStartChecks";
import { allowedActions } from "./reviewCycleRules";
import type { ReviewAction } from "./reviewCycleTypes";

export type ReviewStartInput = { taskId: string; projectId: string; actorId: string; requestKey: string; reviewer: AgentChoice; executor: AgentChoice; partial: boolean; allowOpenSessions: boolean };
export type ReviewCycleServiceDeps = { cycles: Pick<ReviewCycleDao, "findOpen" | "findLatest" | "findByRequestKey" | "create" | "requestAction" | "view">; taskSets: Pick<TaskSetLoader, "load">; sessions: Pick<TerminalExecutionDao, "sessionsOf">; projects: { findById(projectId: string): Promise<ProjectRecord | null> }; guard: Pick<TerminalOpenGuard, "assertServiceRunning" | "requireCheckout" | "assertSkills" | "assertTools">; agents: ReadonlySet<SessionAgent>; catalog: SessionCatalogStatus; hostId: string };

export class ReviewCycleService {
  constructor(private readonly deps: ReviewCycleServiceDeps) {}

  async get(input: { taskId: string }): Promise<ReviewGetView> {
    const [latest, set, sessions] = await Promise.all([this.deps.cycles.findLatest(input.taskId), this.deps.taskSets.load(input.taskId), this.deps.sessions.sessionsOf(input.taskId)]);
    const [cycle, agents] = await Promise.all([latest ? this.deps.cycles.view(latest.id) : Promise.resolve(null), this.agents()]);
    const tasks = set?.problem === null ? set.tasks : [];
    return { cycle, defaults: reviewDefaults(latest), tasks: { total: tasks.length, completed: tasks.filter((task) => task.status === "completed").length }, activeSessions: sessions.filter((session) => isActiveSession(session.status)).length, agents };
  }

  private async agents() {
    const [running, codex] = await Promise.all([this.deps.catalog.running(), this.deps.catalog.codexStatus()]);
    return publishedAgentAvailability(this.deps.agents, codex, running);
  }

  async start(input: ReviewStartInput): Promise<ReviewCycleView> {
    const existing = await this.deps.cycles.findByRequestKey(input.actorId, input.requestKey);
    if (existing) return this.viewOf(existing.id);
    const set = requireReadableTaskSet(await this.deps.taskSets.load(input.taskId));
    requireCompleteTasks(set, input.partial);
    const [open, sessions] = await Promise.all([this.deps.cycles.findOpen(input.taskId), this.deps.sessions.sessionsOf(input.taskId)]);
    requireNoActiveCycle(open);
    requireNoOpenSessions(sessions.filter((session) => isActiveSession(session.status)).length, input.allowOpenSessions);
    await requireReviewChoices({ guard: this.deps.guard, agents: this.deps.agents, catalog: this.deps.catalog, choices: [input.reviewer, input.executor] });
    await this.deps.guard.assertServiceRunning();
    const project = await this.deps.projects.findById(input.projectId);
    if (!project) throw new TaskError("project_unavailable");
    await this.deps.guard.requireCheckout({ userId: input.actorId, projectId: input.projectId, repository: repositoryOf(project) });
    await this.deps.guard.assertSkills();
    const created = await this.createCycle(input, set.folder);
    return this.viewOf(created.id);
  }

  async request(input: { taskId: string; cycleId: string; revision: number; action: ReviewAction; by: string; at: Date }): Promise<ReviewCycleView> {
    const cycle = await this.deps.cycles.findLatest(input.taskId);
    if (!cycle || cycle.id !== input.cycleId || cycle.revision !== input.revision) throw new TaskError("review_cycle_changed");
    if (!allowedActions(cycle.state).includes(input.action)) throw new TaskError("review_action_invalid");
    const updated = await this.deps.cycles.requestAction({ cycleId: cycle.id, revision: input.revision, action: input.action, by: input.by, at: input.at });
    if (!updated) throw new TaskError("review_cycle_changed");
    return this.viewOf(updated.id);
  }

  private async createCycle(input: ReviewStartInput, tasksFolder: string) {
    const cycle: NewReviewCycle = { taskId: input.taskId, projectId: input.projectId, hostId: this.deps.hostId, startedBy: input.actorId, requestKey: input.requestKey, reviewer: input.reviewer, executor: input.executor, tasksFolder, partial: input.partial };
    try {
      return await this.deps.cycles.create(cycle);
    } catch (error) {
      const existing = await this.deps.cycles.findByRequestKey(input.actorId, input.requestKey);
      if (existing) return existing;
      if (constraintName(error) === "task_review_cycles_task_active_unique") throw new TaskError("review_cycle_active", undefined, error);
      throw error;
    }
  }

  private async viewOf(cycleId: string) {
    const view = await this.deps.cycles.view(cycleId);
    if (!view) throw new TaskError("task_unavailable");
    return view;
  }
}

function constraintName(error: unknown) {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as { constraint_name?: unknown; cause?: { constraint_name?: unknown } };
  const name = candidate.cause?.constraint_name ?? candidate.constraint_name;
  return typeof name === "string" ? name : null;
}
