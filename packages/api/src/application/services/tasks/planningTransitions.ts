import { TaskError } from "./taskErrors";
import type { PlanningRoute } from "./planningContracts";

type PlanningTask = { authorUserId: string; version: number; status: string; activeOperationId: string | null; planningStatus: string | null; planningOperationId?: string | null };
type PlanningActor = { actorUserId: string; expectedVersion: number };
type PlanningDecisionState = { id: string; version: number; status: string; selectedRoute: PlanningRoute };
type ReviewInput = PlanningActor & { decisionId: string; expectedDecisionVersion: number };

export function assertAuthorAndVersion(task: PlanningTask, input: PlanningActor) {
  if (task.authorUserId !== input.actorUserId) throw new TaskError("author_required");
  if (task.version !== input.expectedVersion) throw new TaskError("planning_conflict");
}

export function assertStartable(task: PlanningTask, input: PlanningActor) {
  assertAuthorAndVersion(task, input);
  if (task.status !== "published") throw new TaskError("publication_required");
  if (task.activeOperationId) throw new TaskError("operation_active");
  if (task.planningStatus === "failed") throw new TaskError("planning_retry_required");
  if (task.planningStatus === "review" || task.planningStatus === "approved") throw new TaskError("planning_exists");
}

export function assertRetryable(task: PlanningTask, operation: { id: string; state: string } | null, failedOperationId: string) {
  if (task.status !== "published") throw new TaskError("publication_required");
  if (task.activeOperationId) throw new TaskError("operation_active");
  if (task.planningStatus === "review" || task.planningStatus === "approved") throw new TaskError("planning_exists");
  if (task.planningStatus !== "failed" || operation?.id !== failedOperationId || operation.state !== "failed") throw new TaskError("planning_not_failed");
}

export function assertSelectable(task: PlanningTask, decision: PlanningDecisionState | null, input: ReviewInput) {
  assertAuthorAndVersionBoundary(task, input);
  if (!decision) throw new TaskError("planning_not_ready");
  if (decision.status === "approved") throw new TaskError("planning_approved");
  if (decision.status !== "review" || task.planningStatus !== "review") throw new TaskError("planning_not_ready");
  if (task.version !== input.expectedVersion || decision.version !== input.expectedDecisionVersion) throw new TaskError("planning_conflict");
}

export function isApprovalReplay(decision: PlanningDecisionState, input: ReviewInput & { reviewedRoute: PlanningRoute }) {
  return decision.status === "approved" && decision.id === input.decisionId && decision.version === input.expectedDecisionVersion && decision.selectedRoute === input.reviewedRoute;
}

export function assertApprovable(task: PlanningTask, decision: PlanningDecisionState | null, input: ReviewInput & { reviewedRoute: PlanningRoute }) {
  assertAuthorAndVersionBoundary(task, input);
  if (!decision) throw new TaskError("planning_not_ready");
  if (decision.status === "approved") throw new TaskError("planning_conflict");
  if (task.planningStatus !== "review") throw new TaskError("planning_not_ready");
  if (task.version !== input.expectedVersion || decision.version !== input.expectedDecisionVersion || decision.selectedRoute !== input.reviewedRoute) throw new TaskError("planning_conflict");
}

function assertAuthorAndVersionBoundary(task: PlanningTask, input: PlanningActor) {
  if (task.authorUserId !== input.actorUserId) throw new TaskError("author_required");
}
