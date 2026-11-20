import type { IssueClaimDao } from "../../database/dao/issueClaimDao";
import type { ExecutionRecord, TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import { isTerminalExecution } from "./executionContracts";
import type { ExecutionFactsReader } from "./executionFactsReader";
import { executionStartBlocker } from "./executionStartRules";
import type { SyncOutcome } from "./executionSyncService";

export const EXECUTION_SYNC_INTERVAL_MS = 5_000;
const CLAIMED_STATE = "claimed";

export type ExecutionReconciler = (execution: ExecutionRecord) => Promise<SyncOutcome>;
type StatusDeps = { dao: TaskExecutionDao; facts: ExecutionFactsReader; claims: Pick<IssueClaimDao, "claimByTask">; reconcile: ExecutionReconciler; clock: () => Date };
type StatusScope = { projectId: string; taskId: string; actorId: string };

export class ExecutionStatusService {
  constructor(private readonly deps: StatusDeps) {}

  async status(scope: StatusScope) {
    const synced = await this.currentExecution(scope.taskId);
    const history = await this.deps.dao.history(scope.taskId, synced?.execution.id ?? null);
    const specReviews = synced ? await this.deps.dao.listSpecReviews(synced.execution.id) : [];
    const blocker = executionStartBlocker(await this.deps.facts.read({ ...scope, claimed: await this.isClaimed(scope) }));
    const active = synced ? !isTerminalExecution(synced.execution.state) : false;
    return {
      canStart: !active && blocker === null,
      startBlockedBy: active ? null : blocker,
      current: synced,
      history,
      specReviews,
    };
  }

  async currentExecution(taskId: string): Promise<SyncOutcome | null> {
    const execution = await this.deps.dao.current(taskId);
    if (!execution) return null;
    if (!this.isStale(execution)) return { execution, reachable: true };
    return this.deps.reconcile(execution);
  }

  private isStale(execution: ExecutionRecord) {
    if (isTerminalExecution(execution.state) || !execution.workTaskId) return false;
    if (!execution.lastSyncedAt) return true;
    return this.deps.clock().getTime() - execution.lastSyncedAt.getTime() > EXECUTION_SYNC_INTERVAL_MS;
  }

  private async isClaimed(scope: StatusScope) {
    const claim = await this.deps.claims.claimByTask(scope.projectId, scope.taskId);
    return claim?.state === CLAIMED_STATE && claim.operatorUserId === scope.actorId;
  }
}
