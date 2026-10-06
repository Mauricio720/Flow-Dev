import { and, count, eq, gt, isNull, ne, or } from "drizzle-orm";
import type { ContextCall, ContextExecution, IssueContextDao } from "../../../../application/database/dao/issueContextDao";
import { tasks, taskContextCapabilities, taskEvidence, taskOperations, taskToolActivity, taskToolCalls, projects, sessions } from "../../schema";
import type { Database } from "../../client";
import { persistContextCall } from "./issueContextPersistence";

const generatingExecution = and(eq(taskOperations.kind, "generate"), eq(tasks.status, "generating"));
const planningExecution = and(eq(taskOperations.kind, "plan"), eq(tasks.planningOperationId, taskOperations.id), eq(tasks.planningStatus, "in_progress"));

export class DrizzleIssueContextDao implements IssueContextDao {
  constructor(private readonly database: Database) {}

  async execution(executionId: string, capabilityHash: string, now: Date): Promise<ContextExecution | null> {
    const row = (await this.database.select({ operation: taskOperations, task: tasks, capability: taskContextCapabilities, project: projects }).from(taskOperations).innerJoin(tasks, eq(taskOperations.taskId, tasks.id)).innerJoin(taskContextCapabilities, eq(taskContextCapabilities.operationId, taskOperations.id)).innerJoin(projects, eq(projects.id, tasks.projectId)).where(and(eq(taskOperations.executionId, executionId), eq(taskOperations.state, "running"), eq(tasks.activeOperationId, taskOperations.id), or(generatingExecution, planningExecution), eq(taskContextCapabilities.executionId, executionId), eq(taskContextCapabilities.tokenHash, capabilityHash), eq(taskContextCapabilities.fence, taskOperations.fence), gt(taskContextCapabilities.expiresAt, now))).limit(1))[0];
    if (!row) return null;
    const session = (await this.database.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.id, row.operation.initiatedSessionId), eq(sessions.userId, row.task.authorUserId), gt(sessions.expiresAt, now))).limit(1))[0];
    if (!session) return null;
    return { taskId: row.task.id, operationId: row.operation.id, executionId, fence: row.operation.fence, userId: row.task.authorUserId, sessionId: session.id, projectId: row.task.projectId, repositoryId: row.task.repositoryId, repositoryNodeId: row.task.repositoryNodeId, repository: { githubId: row.project.githubRepositoryId, nodeId: row.project.githubNodeId, owner: row.project.repositoryOwner, name: row.project.repositoryName, visibility: row.project.repositoryVisibility as ContextExecution["repository"]["visibility"], archived: row.project.repositoryArchived }, pinnedCommitSha: row.capability.pinnedCommitSha };
  }

  async supersededExecution(executionId: string, capabilityHash: string) {
    return (await this.database.select({ id: taskOperations.id }).from(taskContextCapabilities).innerJoin(taskOperations, eq(taskContextCapabilities.operationId, taskOperations.id)).where(and(eq(taskContextCapabilities.executionId, executionId), eq(taskContextCapabilities.tokenHash, capabilityHash), ne(taskOperations.executionId, executionId))).limit(1)).length > 0;
  }

  async pinCommit(executionId: string, fence: number, commitSha: string) {
    await this.database.update(taskContextCapabilities).set({ pinnedCommitSha: commitSha }).where(and(eq(taskContextCapabilities.executionId, executionId), eq(taskContextCapabilities.fence, fence), isNull(taskContextCapabilities.pinnedCommitSha)));
    const row = (await this.database.select({ commitSha: taskContextCapabilities.pinnedCommitSha }).from(taskContextCapabilities).where(and(eq(taskContextCapabilities.executionId, executionId), eq(taskContextCapabilities.fence, fence))).limit(1))[0];
    if (!row?.commitSha) throw new Error("context capability unavailable");
    return row.commitSha;
  }

  findCall(executionId: string, toolCallId: string) { return findContextCall(this.database, executionId, toolCallId); }
  saveCall(context: ContextExecution, call: ContextCall) { return persistContextCall(this.database, context, call); }
  async activityCount(executionId: string) { return (await this.database.select({ value: count() }).from(taskToolActivity).where(eq(taskToolActivity.executionId, executionId)))[0]?.value ?? 0; }

  async hasActivity(executionId: string, toolCallId: string) {
    return (await this.database.select({ id: taskToolActivity.id }).from(taskToolActivity).where(and(eq(taskToolActivity.executionId, executionId), eq(taskToolActivity.toolCallId, toolCallId))).limit(1)).length > 0;
  }
}

async function findContextCall(database: Database, executionId: string, toolCallId: string) {
  const row = (await database.select({ inputHash: taskToolCalls.inputHash, response: taskToolCalls.result }).from(taskToolCalls).where(and(eq(taskToolCalls.executionId, executionId), eq(taskToolCalls.toolCallId, toolCallId))).limit(1))[0];
  return row ?? null;
}
