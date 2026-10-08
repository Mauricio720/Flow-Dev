import type { TaskMessage } from "../../../../application/services/tasks/taskContracts";
import type { TaskRecord, TaskRevisionRecord } from "../../../../application/database/dao/taskDao";

export function toTaskRecord(row: Record<string, unknown>): TaskRecord {
  return { id: String(row.id), projectId: String(row.projectId), authorUserId: row.authorUserId == null ? "" : String(row.authorUserId), repositoryId: String(row.repositoryId), repositoryNodeId: String(row.repositoryNodeId), status: String(row.status), version: Number(row.version), currentRevisionId: row.currentRevisionId ? String(row.currentRevisionId) : null, activeOperationId: row.activeOperationId ? String(row.activeOperationId) : null, planningStatus: row.planningStatus ? String(row.planningStatus) : null, pendingProposalOperationId: row.pendingProposalOperationId ? String(row.pendingProposalOperationId) : null, title: String(row.title), lastError: row.lastError ? String(row.lastError) : null, createdAt: row.createdAt as Date, updatedAt: row.updatedAt as Date };
}

export function toTaskMessage(row: Record<string, unknown>): TaskMessage {
  return { id: String(row.id), operationId: row.operationId ? String(row.operationId) : null, sequence: Number(row.sequence), role: row.role as TaskMessage["role"], kind: row.kind as TaskMessage["kind"], content: String(row.content), createdAt: (row.createdAt as Date).toISOString() };
}

export function toTaskRevision(row: Record<string, unknown>): TaskRevisionRecord {
  return { id: String(row.id), taskId: String(row.taskId), revisionNumber: Number(row.revisionNumber), parentRevisionId: row.parentRevisionId ? String(row.parentRevisionId) : null, operationId: row.operationId ? String(row.operationId) : null, canonicalDraft: row.canonicalDraft, evidenceBindings: row.evidenceBindings as unknown[], manuallyEditedPaths: row.manuallyEditedPaths as string[], createdAt: row.createdAt as Date };
}
