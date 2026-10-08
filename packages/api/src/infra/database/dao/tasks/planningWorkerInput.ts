import { and, eq, gt } from "drizzle-orm";
import type { PlanningClaim } from "../../../../application/database/dao/taskPlanningWorkerDao";
import { PLANNING_LEASE_MS } from "../../../../application/services/tasks/planningWorkerRules";
import { buildPlanningInput } from "../../../../application/services/tasks/planningRules";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import type { PlanningDispatch } from "../../../../application/services/tasks/planningContracts";
import { sessions, taskContextCapabilities, taskIssueSnapshots, taskIssueSources, taskOperations, taskPublicationAttempts, tasks } from "../../schema";
import { PLANNING_SOURCE_FORMAT_VERSION, buildSourcePlanningInput } from "../../../../application/services/tasks/planningSourceInput";
import { loadSource } from "../assigned-issues/sourceRecords";
import type { Database } from "../../client";

export async function heartbeatPlanning(database: Database, claim: PlanningClaim, now: Date) {
  const updated = await database.update(taskOperations).set({ heartbeatAt: now, leaseUntil: new Date(now.getTime() + PLANNING_LEASE_MS) }).where(and(eq(taskOperations.id, claim.operationId), eq(taskOperations.state, "running"), eq(taskOperations.executionId, claim.executionId), eq(taskOperations.fence, claim.fence), eq(taskOperations.leaseOwner, claim.workerId))).returning({ id: taskOperations.id });
  if (!updated.length) throw new TaskError("stale_execution");
  await database.update(taskContextCapabilities).set({ expiresAt: new Date(now.getTime() + PLANNING_LEASE_MS) }).where(and(eq(taskContextCapabilities.operationId, claim.operationId), eq(taskContextCapabilities.executionId, claim.executionId), eq(taskContextCapabilities.fence, claim.fence)));
}

export async function planningSessionActive(database: Database, claim: PlanningClaim, now: Date) {
  const rows = await database.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.id, claim.sessionId), eq(sessions.userId, claim.requesterUserId), gt(sessions.expiresAt, now))).limit(1);
  return rows.length > 0;
}

export async function readPlanningInput(database: Database, claim: PlanningClaim): Promise<PlanningDispatch> {
  const [operation] = await database.select().from(taskOperations).where(eq(taskOperations.id, claim.operationId)).limit(1);
  if (!operation) throw new TaskError("invalid_stored_content");
  if (operation.sourceFormatVersion === PLANNING_SOURCE_FORMAT_VERSION) return readSourceInput(database, { claim, operation });
  return readLegacyInput(database, { claim, operation });
}

async function readSourceInput(database: Database, input: { claim: PlanningClaim; operation: typeof taskOperations.$inferSelect }): Promise<PlanningDispatch> {
  const { claim, operation } = input;
  const source = await loadSource(database, eq(taskIssueSources.taskId, claim.taskId));
  const [snapshot] = await database.select().from(taskIssueSnapshots).where(eq(taskIssueSnapshots.id, operation.sourceSnapshotId ?? "")).limit(1);
  if (!source || !snapshot) throw new TaskError("invalid_stored_content");
  const planning = buildSourcePlanningInput({ snapshotId: snapshot.id, repositoryId: source.identity.repositoryId, repositoryNodeId: source.identity.repositoryNodeId, issueNodeId: source.identity.issueNodeId, issueNumber: source.issueNumber, title: snapshot.title, bodyMarkdown: snapshot.bodyMarkdown }, { taskId: claim.taskId, operationId: claim.operationId, executionId: claim.executionId });
  if (planning.inputHash !== operation.inputHash) throw new TaskError("invalid_stored_content");
  return { ...planning, issueUrl: source.issueUrl, contextCapability: claim.contextCapability };
}

async function readLegacyInput(database: Database, target: { claim: PlanningClaim; operation: typeof taskOperations.$inferSelect }): Promise<PlanningDispatch> {
  const { claim, operation } = target;
  const [task] = await database.select().from(tasks).where(eq(tasks.id, claim.taskId)).limit(1);
  const [publication] = await database.select().from(taskPublicationAttempts).where(eq(taskPublicationAttempts.id, operation.publicationAttemptId ?? "")).limit(1);
  if (!task || !publication?.issueId || !publication.issueNumber || !publication.issueUrl) throw new TaskError("invalid_stored_content");
  const input = buildPlanningInput({ outcome: publication.outcome, taskId: task.id, repositoryBindingMatches: publication.repositoryId === task.repositoryId && publication.repositoryNodeId === task.repositoryNodeId, attemptId: publication.id, repositoryId: publication.repositoryId, repositoryNodeId: publication.repositoryNodeId, issueId: publication.issueId, issueNumber: publication.issueNumber, issueUrl: publication.issueUrl, title: publication.titleSnapshot, bodyMarkdown: publication.bodySnapshot }, { operationId: claim.operationId, executionId: claim.executionId, taskId: claim.taskId });
  if (input.inputHash !== operation.inputHash) throw new TaskError("invalid_stored_content");
  return { ...input, issueUrl: publication.issueUrl, contextCapability: claim.contextCapability };
}
