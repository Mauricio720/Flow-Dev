import type { PlanningRoute } from "../../services/tasks/planningContracts";
import type { ExecutionState, SpecDecision } from "../../services/execution/executionContracts";
import type { StartDecision } from "../../services/execution/executionStartRules";

export type ExecutionRecord = {
  id: string;
  taskId: string;
  planningDecisionId: string;
  route: PlanningRoute;
  state: ExecutionState;
  attempt: number;
  idempotencyKey: string;
  compozyWorkspaceId: string;
  specTaskId: string | null;
  specWorktreeId: string | null;
  specDir: string | null;
  workTaskId: string | null;
  branch: string;
  specRound: number;
  pullRequestUrl: string | null;
  detail: Record<string, unknown>;
  failureCode: string | null;
  lastSyncedAt: Date | null;
  startedBy: string;
  createdAt: Date;
  finishedAt: Date | null;
};

export type ExecutionDecisionRecord = StartDecision & { summary: string; reasons: string[] };
export type SpecReviewRecord = { id: string; executionId: string; round: number; decision: SpecDecision; note: string | null; actorId: string; actorName: string | null; idempotencyKey: string; createdAt: Date };
export type SpecReviewInsert = Pick<SpecReviewRecord, "executionId" | "round" | "decision" | "note" | "actorId" | "idempotencyKey">;
export type DispatchInsert = { id: string; taskId: string; planningDecisionId: string; route: PlanningRoute; idempotencyKey: string; compozyWorkspaceId: string; branch: string; startedBy: string };
export type ExecutionPatch = Partial<Pick<ExecutionRecord, "state" | "specTaskId" | "specWorktreeId" | "specDir" | "specRound" | "workTaskId" | "pullRequestUrl" | "detail" | "failureCode" | "lastSyncedAt" | "finishedAt">>;
export type ExecutionTransition = { id: string; from: ExecutionState[]; patch: ExecutionPatch };

export interface TaskExecutionDao {
  latestDecision(taskId: string): Promise<ExecutionDecisionRecord | null>;
  findByRequest(taskId: string, idempotencyKey: string): Promise<ExecutionRecord | null>;
  findById(taskId: string, executionId: string): Promise<ExecutionRecord | null>;
  current(taskId: string): Promise<ExecutionRecord | null>;
  history(taskId: string, excludeId: string | null): Promise<ExecutionRecord[]>;
  findSpecReviewByKey(idempotencyKey: string): Promise<SpecReviewRecord | null>;
  listSpecReviews(executionId: string): Promise<SpecReviewRecord[]>;
  insertSpecReview(review: SpecReviewInsert): Promise<SpecReviewRecord | null>;
  insertDispatching(insert: DispatchInsert): Promise<ExecutionRecord | null>;
  transition(transition: ExecutionTransition): Promise<ExecutionRecord | null>;
}
