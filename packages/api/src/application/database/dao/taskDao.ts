import type { PlanningProjectionRecord } from "./taskPlanningDao";
import type { TaskLabel } from "../../../schemas/taskLabels";
import type { IssueDraft, TaskMessage, TaskPublication, TaskSummary, TaskToolActivity } from "../../services/tasks/taskContracts";

export type TaskRecord = { id: string; projectId: string; authorUserId: string; repositoryId: string; repositoryNodeId: string; status: string; version: number; currentRevisionId: string | null; activeOperationId: string | null; planningStatus: string | null; pendingProposalOperationId: string | null; title: string; lastError: string | null; createdAt: Date; updatedAt: Date };
export type TaskReceipt = { taskId: string; operationId: string; acceptedMessageId: string; version: number };
export type TaskRevisionRecord = { id: string; taskId: string; revisionNumber: number; parentRevisionId: string | null; operationId: string | null; canonicalDraft: unknown; evidenceBindings: unknown[]; manuallyEditedPaths: string[]; createdAt: Date };
export type TaskEvidenceRecord = { id: string; repositoryId: string; operationId: string; type: "project-file" | "github-issue"; path: string | null; commitSha: string | null; fromLine: number | null; toLine: number | null; issueId: string | null; issueNumber: number | null; url: string | null };
export type TaskListQuery = { projectId: string; search?: string; cursor?: string; limit: number };
export type TaskCommandInput = { projectId: string; taskId: string; actorUserId: string; sessionId: string; requestKey: string; expectedVersion: number; message: string };
export type TaskStartInput = Omit<TaskCommandInput, "taskId" | "expectedVersion"> & { repositoryId: string; repositoryNodeId: string; sessionId: string };

export interface TaskDao {
  list(input: TaskListQuery): Promise<{ items: TaskSummary[]; nextCursor: string | null }>;
  findScoped(projectId: string, taskId: string): Promise<TaskRecord | null>;
  findRevision(taskId: string, revisionId: string): Promise<TaskRevisionRecord | null>;
  currentRevision(taskId: string): Promise<TaskRevisionRecord | null>;
  evidence(taskId: string): Promise<TaskEvidenceRecord[]>;
  pendingProposal(taskId: string): Promise<{ operationId: string; draft: IssueDraft; baseRevisionId: string | null } | null>;
  publication(taskId: string): Promise<TaskPublication | null>;
  activity(taskId: string): Promise<TaskToolActivity[]>;
  authorNames(userIds: string[]): Promise<Map<string, string>>;
  planning(taskId: string): Promise<PlanningProjectionRecord>;
  snapshot<T>(read: (dao: TaskDao) => Promise<T>): Promise<T>;
  messages(taskId: string, cursor: string | undefined, limit: number): Promise<{ items: TaskMessage[]; nextCursor: string | null }>;
  revisions(taskId: string, cursor: string | undefined, limit: number): Promise<{ items: TaskRevisionRecord[]; nextCursor: string | null }>;
  start(input: TaskStartInput): Promise<TaskReceipt>;
  send(input: TaskCommandInput, kind: "clarification" | "refinement"): Promise<TaskReceipt>;
  retryGeneration(input: Omit<TaskCommandInput, "message"> & { failedOperationId: string }): Promise<TaskReceipt>;
  submission(input: { projectId: string; actorUserId: string; action: string; requestKey: string }): Promise<TaskReceipt | null>;
  resolveRefinement(input: { taskId: string; projectId: string; actorUserId: string; expectedVersion: number; requestKey: string; proposalOperationId: string; decision: "apply" | "discard"; selectedPaths: string[] }): Promise<{ revision: TaskRevisionRecord | null; version: number }>;
  saveDraft(input: { taskId: string; actorUserId: string; projectId: string; expectedVersion: number; baseRevisionId: string; requestKey: string; draft: IssueDraft; evidenceBindings: unknown[] }): Promise<TaskRevisionRecord>;
}

import { planningListStatus } from "../../services/tasks/planningRules";

export function mapTaskSummary(task: TaskRecord, labels: TaskLabel[] = []): TaskSummary {
  return { id: task.id, projectId: task.projectId, authorUserId: task.authorUserId, status: task.status as TaskSummary["status"], planningStatus: planningListStatus(task.status, task.planningStatus), version: task.version, title: task.title, labels, createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString() };
}
