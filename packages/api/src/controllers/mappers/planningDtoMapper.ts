import type { PlanningDecisionRecord, PlanningProjectionRecord } from "../../application/database/dao/taskPlanningDao";
import { parsePlanningAssessment, planningEligibility, planningListStatus } from "../../application/services/tasks/planningRules";
import { PlanningDomainError } from "../../application/services/tasks/planningContracts";
import { TaskError } from "../../application/services/tasks/taskErrors";

type Viewer = { isAuthor: boolean };
const EMPTY_PERMISSIONS = { canStart: false, canRetry: false, canSelectRoute: false, canApprove: false };

export { planningListStatus };

export function planningDto(record: PlanningProjectionRecord, viewer: Viewer, now = new Date()) {
  if (record.taskStatus !== "published") return { status: null, eligibility: { canStart: false, reason: "publication_required" as const }, operation: null, decision: null, permissions: EMPTY_PERMISSIONS };
  const status = record.planningStatus ?? "awaiting";
  const decision = decisionDto(record, status);
  const eligibility = planningEligibility(record.publication, record.taskStatus);
  return { status, eligibility, operation: operationDto(record, now), decision, permissions: permissions(status, eligibility.canStart, viewer) };
}

function permissions(status: string, canStart: boolean, viewer: Viewer) {
  if (!viewer.isAuthor) return EMPTY_PERMISSIONS;
  return { canStart: status === "awaiting" && canStart, canRetry: status === "failed", canSelectRoute: status === "review", canApprove: status === "review" };
}

function decisionDto(record: PlanningProjectionRecord, status: string) {
  if (!record.decision) {
    if (status === "review" || status === "approved") throw new TaskError("invalid_stored_content");
    return null;
  }
  return storedDecision(record.decision);
}

function storedDecision(decision: PlanningDecisionRecord) {
  try {
    const assessment = parsePlanningAssessment({ recommendedRoute: decision.recommendedRoute, complexity: decision.complexity, summary: decision.summary, reasons: decision.reasons, uncertainties: decision.uncertainties });
    return { id: decision.id, taskId: decision.taskId, publicationAttemptId: decision.publicationAttemptId, operationId: decision.operationId, executionId: decision.executionId, version: decision.version, ...assessment, selectedRoute: decision.selectedRoute, decisionSource: decision.decisionSource, status: decision.status, createdAt: decision.createdAt.toISOString(), approvedByUserId: decision.approvedByUserId, approvedAt: decision.approvedAt?.toISOString() ?? null };
  } catch (error) {
    if (error instanceof PlanningDomainError) throw new TaskError("invalid_stored_content");
    throw error;
  }
}

function operationDto(record: PlanningProjectionRecord, now: Date) {
  const operation = record.operation;
  if (!operation) return null;
  const retryAt = operation.state === "queued" && operation.attempts > 0 && operation.nextRunAt > now ? operation.nextRunAt.toISOString() : null;
  return { id: operation.id, state: operation.state, createdAt: operation.createdAt.toISOString(), reason: operation.state === "failed" ? operation.lastError : null, retryAt };
}
