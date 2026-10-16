import { and, eq, sql } from "drizzle-orm";
import { issueDeletionOperations } from "../../schema";
import type { Database } from "../../client";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { AssignedIssueError } from "../../../../application/services/assigned-issues/assignedIssueErrors";

const NOT_COMPLETED = sql`${issueDeletionOperations.state} <> 'completed'`;

export async function activeDeletionForTask(database: Database, taskId: string) {
  const row = (await database.select({ id: issueDeletionOperations.id }).from(issueDeletionOperations).where(and(eq(issueDeletionOperations.taskId, taskId), NOT_COMPLETED)).limit(1))[0];
  return Boolean(row);
}

export async function assertTaskAdmissionAllowed(database: Database, taskId: string) {
  if (await activeDeletionForTask(database, taskId)) throw new TaskError("deletion_fenced");
}

export async function assertQueueAdmissionAllowed(database: Database, identity: { projectId: string; repositoryId: string; issueNodeId: string }) {
  const row = (await database.select({ id: issueDeletionOperations.id }).from(issueDeletionOperations).where(and(eq(issueDeletionOperations.projectId, identity.projectId), eq(issueDeletionOperations.repositoryId, identity.repositoryId), eq(issueDeletionOperations.issueNodeId, identity.issueNodeId), NOT_COMPLETED)).limit(1))[0];
  if (row) throw new AssignedIssueError("deletion_pending");
}
