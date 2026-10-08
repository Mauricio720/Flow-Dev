import type { PlanningAssessment, PlanningRoute, PlanningStatus } from "../../services/tasks/planningContracts";
import type { PlanningPublicationRecord } from "../../services/tasks/planningRules";

export type PlanningReceipt = { taskId: string; operationId: string | null; decisionId: string | null; version: number; decisionVersion: number | null };
export type PlanningCommandResult = PlanningReceipt & { replayed: boolean };
export type PlanningDecisionRecord = PlanningAssessment & { id: string; taskId: string; publicationAttemptId: string | null; sourceSnapshotId: string | null; requesterUserId: string | null; sourceFormatVersion: number; operationId: string; executionId: string; version: number; selectedRoute: PlanningRoute; decisionSource: "AI" | "HUMAN_OVERRIDE"; status: "review" | "approved"; createdAt: Date; approvedByUserId: string | null; approvedAt: Date | null };
export type PlanningOperationRecord = { id: string; state: string; createdAt: Date; lastError: string | null; nextRunAt: Date; attempts: number };
export type PlanningSourceRecord = { snapshotId: string; revision: number; origin: "flow_dev" | "external"; publicationAttemptId: string | null; issueNodeId: string; issueNumber: number; issueUrl: string; repositoryId: string; repositoryNodeId: string; title: string; bodyMarkdown: string; contentHash: string; claim: { state: string; operatorUserId: string | null; revision: number } | null };
export type PlanningDecisionSummary = { id: string; version: number; status: "review" | "approved"; selectedRoute: PlanningRoute; sourceSnapshotId: string | null; createdAt: Date };
export type PlanningProjectionRecord = { taskStatus: string; planningStatus: PlanningStatus | null; operation: PlanningOperationRecord | null; decision: PlanningDecisionRecord | null; publication: PlanningPublicationRecord | null; source: PlanningSourceRecord | null; history: PlanningDecisionSummary[] };
export type PlanningCommandTarget = { projectId: string; taskId: string; actorUserId: string; requestKey: string; payloadHash: string };
type Versioned = PlanningCommandTarget & { expectedVersion: number };
type Accepting = Versioned & { sessionId: string; beforeAccept?: () => void };
type Reviewing = Versioned & { decisionId: string; expectedDecisionVersion: number };

export interface TaskPlanningDao {
  submission(target: Omit<PlanningCommandTarget, "payloadHash">, action: string): Promise<PlanningReceipt | null>;
  projection(taskId: string): Promise<PlanningProjectionRecord>;
  start(input: Accepting): Promise<PlanningCommandResult>;
  retry(input: Accepting & { failedOperationId: string }): Promise<PlanningCommandResult>;
  selectRoute(input: Reviewing & { selectedRoute: PlanningRoute }): Promise<PlanningCommandResult>;
  approve(input: Reviewing & { reviewedRoute: PlanningRoute }): Promise<PlanningCommandResult>;
}
