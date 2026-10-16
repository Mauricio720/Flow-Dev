import type { DeletionOperation, RemotePresence } from "../../../../application/services/issue-deletion/issueDeletionContracts";
import { issueDeletionOperations, tasks } from "../../schema";

export function mapOperation(row: typeof issueDeletionOperations.$inferSelect): DeletionOperation {
  return {
    id: row.id,
    projectId: row.projectId,
    taskId: row.taskId,
    repositoryId: row.repositoryId,
    repositoryNodeId: row.repositoryNodeId,
    issueNodeId: row.issueNodeId,
    issueNumber: row.issueNumber,
    initiatorUserId: row.initiatorUserId,
    requestKey: row.requestKey,
    state: row.state as DeletionOperation["state"],
    remotePresence: row.remotePresence as RemotePresence,
    workStopped: row.workStopped,
    reason: row.reason,
    retryAt: row.retryAt,
    leaseOwner: row.leaseOwner,
    leaseFence: row.leaseFence,
    leaseUntil: row.leaseUntil,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

export function assertTaskBound(row: typeof tasks.$inferSelect | undefined, projectId: string, taskId: string) {
  if (!row || row.projectId !== projectId || row.id !== taskId) return false;
  return true;
}
