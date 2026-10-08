import type { PlanningClaim, TaskPlanningWorkerDao } from "../application/database/dao/taskPlanningWorkerDao";
import type { PlanningGateway } from "../application/planning/planningGateway";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { AssignedIssueError } from "../application/services/assigned-issues/assignedIssueErrors";
import { PLANNING_DEADLINE_MS, PLANNING_REQUEST_DEADLINE_MS } from "../application/services/tasks/planningWorkerRules";
import { TaskError } from "../application/services/tasks/taskErrors";
import { classifyPlanningError } from "./planningWorkerOutcome";
import { logPlanningWorkerEvent } from "./planningWorkerEvents";

const HEARTBEAT_MS = 15_000;

type Run = { claim: PlanningClaim; startedAt: number };

export class TaskPlanningWorkerController {
  constructor(private readonly claims: TaskPlanningWorkerDao, private readonly repositories: RepositoryAccessService, private readonly gateway: PlanningGateway, private readonly workerId = crypto.randomUUID(), private readonly clock = () => new Date(), private readonly authorization?: WorkAuthorization) {}

  async tick(shutdown?: AbortSignal) {
    const claim = await this.claims.claim(this.workerId);
    if (!claim) return false;
    const startedAt = this.clock().getTime();
    const queuedAt = claim.deadline.getTime() - PLANNING_DEADLINE_MS;
    logPlanningWorkerEvent("planning.claimed", claim, { queueAgeMs: startedAt - queuedAt });
    await this.dispatch({ claim, startedAt }, shutdown);
    return true;
  }

  private async dispatch(run: Run, shutdown?: AbortSignal) {
    const abort = new AbortController();
    const stop = () => abort.abort();
    if (shutdown?.aborted) stop();
    shutdown?.addEventListener("abort", stop, { once: true });
    let heartbeatFailure: unknown;
    const timer = setInterval(() => { void this.claims.heartbeat(run.claim).catch((error) => { heartbeatFailure = error; abort.abort(); }); }, HEARTBEAT_MS);
    try {
      await this.analyzeAndSave(run, abort.signal, () => heartbeatFailure);
    } catch (error) {
      await this.settleError(run, heartbeatFailure ? new TaskError("stale_execution") : error);
    } finally {
      clearInterval(timer);
      shutdown?.removeEventListener("abort", stop);
    }
  }

  private async analyzeAndSave(run: Run, signal: AbortSignal, heartbeatFailure: () => unknown) {
    const { claim } = run;
    if (claim.deadline.getTime() - this.clock().getTime() < PLANNING_REQUEST_DEADLINE_MS) throw new TaskError("planning_deadline");
    await this.authorize(claim);
    const input = await this.claims.input(claim);
    const envelope = await this.gateway.analyze(input, signal);
    if (heartbeatFailure()) throw new TaskError("stale_execution");
    await this.claims.complete({ claim, envelope });
    logPlanningWorkerEvent("planning.saved", claim, { elapsedMs: this.elapsed(run) });
  }

  private async authorize(claim: PlanningClaim) {
    try { await this.authorization?.requireOperate({ projectId: claim.projectId, taskId: claim.taskId, actorId: claim.requesterUserId }, { currentSource: true }); }
    catch (error) { if (error instanceof AssignedIssueError || error instanceof TaskError) throw new TaskError("planning_access_revoked", undefined, error); throw error; }
    if (!await this.claims.sessionActive(claim)) throw new TaskError("planning_access_revoked");
    const repository = await this.repositories.requireRead({ userId: claim.requesterUserId, sessionId: claim.sessionId }, claim.projectId);
    if (repository.githubId !== claim.repositoryId || repository.nodeId !== claim.repositoryNodeId) throw new TaskError("planning_access_revoked");
  }

  private async settleError(run: Run, error: unknown) {
    const { claim } = run;
    const outcome = classifyPlanningError(error, claim, this.clock());
    try {
      if (outcome.kind === "abandon") return this.logAbandoned(run, outcome.stale, error);
      if (outcome.kind === "fail") await this.claims.fail({ claim, reason: outcome.reason });
      else await this.claims.requeue({ claim, reason: outcome.reason, nextRunAt: outcome.nextRunAt });
      logPlanningWorkerEvent(outcome.kind === "fail" ? "planning.failed" : "planning.requeued", claim, { reason: outcome.reason, elapsedMs: this.elapsed(run) });
    } catch (settlementError) {
      logPlanningWorkerEvent("planning.stale_result", claim, { reason: settlementError instanceof TaskError ? settlementError.reason : "settlement_unavailable" });
    }
  }

  private logAbandoned(run: Run, stale: boolean, error: unknown) {
    if (stale) return logPlanningWorkerEvent("planning.stale_result", run.claim, { elapsedMs: this.elapsed(run) });
    const errorName = error instanceof Error ? error.name : typeof error;
    logPlanningWorkerEvent("planning.unclassified_error", run.claim, { errorName, elapsedMs: this.elapsed(run) });
  }

  private elapsed(run: Run) {
    return this.clock().getTime() - run.startedAt;
  }
}
