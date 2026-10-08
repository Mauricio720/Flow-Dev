import type { PlanningDecisionRecord, PlanningProjectionRecord } from "../../application/database/dao/taskPlanningDao";
import { parsePlanningAssessment, planningEligibility, planningListStatus } from "../../application/services/tasks/planningRules";
import { decisionMatchesSource, planningSourceEligibility } from "../../application/services/tasks/planningSourceInput";
import { PlanningDomainError } from "../../application/services/tasks/planningContracts";
import { TaskError } from "../../application/services/tasks/taskErrors";

type Viewer = { canOperate: boolean };
const PLANNABLE_STATUSES = ["published", "imported"];
const EMPTY_PERMISSIONS = { canStart: false, canRetry: false, canSelectRoute: false, canApprove: false };

export { planningListStatus };

export function planningDto(record: PlanningProjectionRecord, viewer: Viewer, now = new Date()) {
  if (!PLANNABLE_STATUSES.includes(record.taskStatus)) return { status: null, eligibility: { canStart: false, reason: "publication_required" as const }, operation: null, decision: null, permissions: EMPTY_PERMISSIONS, source: null, history: [] };
  const status = record.planningStatus ?? "awaiting";
  const eligibility = record.source ? planningSourceEligibility({ snapshotId: record.source.snapshotId, repositoryId: record.source.repositoryId, repositoryNodeId: record.source.repositoryNodeId, issueNodeId: record.source.issueNodeId, issueNumber: record.source.issueNumber, title: record.source.title, bodyMarkdown: record.source.bodyMarkdown }) : planningEligibility(record.publication, record.taskStatus);
  const decision = decisionDto(record, status);
  return { status, eligibility, operation: operationDto(record, now), decision: decision && { ...decision, matchesCurrentSource: record.source ? decisionMatchesSource(record.decision!, record.source) : null }, permissions: permissions(status, eligibility.canStart, viewer), source: sourceDto(record), history: record.history.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })) };
}

function sourceDto(record: PlanningProjectionRecord) {
  const source = record.source;
  return source && { snapshotId: source.snapshotId, revision: source.revision, origin: source.origin, contentHash: source.contentHash, issueNumber: source.issueNumber, issueUrl: source.issueUrl };
}

function permissions(status: string, canStart: boolean, viewer: Viewer) {
  if (!viewer.canOperate) return EMPTY_PERMISSIONS;
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
    return { id: decision.id, taskId: decision.taskId, publicationAttemptId: decision.publicationAttemptId, sourceSnapshotId: decision.sourceSnapshotId, operationId: decision.operationId, executionId: decision.executionId, version: decision.version, ...assessment, selectedRoute: decision.selectedRoute, decisionSource: decision.decisionSource, status: decision.status, createdAt: decision.createdAt.toISOString(), approvedByUserId: decision.approvedByUserId, approvedAt: decision.approvedAt?.toISOString() ?? null };
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
