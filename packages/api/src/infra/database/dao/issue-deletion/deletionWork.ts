import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../client";
import { issueDeletionOperations, taskExecutionRuns, taskIssueSources, taskOperations, taskPublicationAttempts, taskSpecAttempts, taskSpecStages, taskSpecWorkflows, tasks } from "../../schema";
import type { FrozenIssueIdentity } from "../../../../application/services/issue-deletion/issueDeletionContracts";

const CANCELABLE_STATES = ["queued", "running", "uncertain"];
const ACTIVE_RUN_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];
const ACTIVE_SPEC_STATES = ["queued", "dispatching", "running", "waiting", "finalizing"];

export async function cancelTaskWork(database: Database, taskId: string, deletionOperationId: string) {
  return database.transaction(async (raw) => {
    const db = raw as unknown as Database;
    const now = new Date();
    await db.update(taskOperations).set({ state: "canceled", deletionOperationId, leaseOwner: null, leaseUntil: null, executionId: null, updatedAt: now })
      .where(and(eq(taskOperations.taskId, taskId), inArray(taskOperations.kind, ["generate", "plan"]), inArray(taskOperations.state, CANCELABLE_STATES)));
    await db.update(taskOperations).set({ state: "canceled", deletionOperationId, leaseOwner: null, leaseUntil: null, executionId: null, updatedAt: now })
      .where(and(eq(taskOperations.taskId, taskId), eq(taskOperations.kind, "publish"), sql`${taskOperations.id} in (select operation_id from task_publication_attempts where task_id = ${taskId} and outcome = 'queued')`));
    await db.update(taskPublicationAttempts).set({ outcome: "rejected", rejectionReason: "deletion_canceled" })
      .where(and(eq(taskPublicationAttempts.taskId, taskId), eq(taskPublicationAttempts.outcome, "queued")));
    await db.update(taskSpecAttempts).set({ state: "stopping", stopRequestedAt: now, leaseFence: sql`${taskSpecAttempts.leaseFence} + 1`, leaseOwner: null, leaseExpiresAt: null, updatedAt: now })
      .where(and(sql`${taskSpecAttempts.workflowId} in (select id from task_spec_workflows where task_id = ${taskId})`, inArray(taskSpecAttempts.state, ACTIVE_SPEC_STATES)));
    await db.update(taskSpecStages).set({ state: "stopping", version: sql`${taskSpecStages.version} + 1`, updatedAt: now })
      .where(and(sql`${taskSpecStages.workflowId} in (select id from task_spec_workflows where task_id = ${taskId})`, eq(taskSpecStages.state, "running")));
    await db.update(taskSpecWorkflows).set({ state: "stopping", version: sql`${taskSpecWorkflows.version} + 1`, updatedAt: now })
      .where(and(eq(taskSpecWorkflows.taskId, taskId), inArray(taskSpecWorkflows.state, ["queued", "running"])));
    await db.update(taskExecutionRuns).set({ state: "stopping", leaseFence: sql`${taskExecutionRuns.leaseFence} + 1`, leaseOwner: null, leaseExpiresAt: null, updatedAt: now })
      .where(and(eq(taskExecutionRuns.taskId, taskId), inArray(taskExecutionRuns.state, ACTIVE_RUN_STATES)));
    await db.update(tasks).set({ activeOperationId: null, pendingProposalOperationId: null, planningOperationId: null, planningStatus: sql`case when ${tasks.planningStatus} = 'in_progress' then 'failed' else ${tasks.planningStatus} end`, status: sql`case when ${tasks.status} = 'publishing' then 'draft_ready' else ${tasks.status} end`, version: sql`${tasks.version} + 1`, updatedAt: now })
      .where(and(eq(tasks.id, taskId), sql`not exists (select 1 from task_operations where task_id = ${taskId} and state in ('queued','running','uncertain'))`));
  });
}

export async function publicationState(database: Database, taskId: string): Promise<{ unresolved: boolean; createdIdentity: FrozenIssueIdentity | null }> {
  const attempts = await database.select().from(taskPublicationAttempts).where(eq(taskPublicationAttempts.taskId, taskId));
  const unresolved = attempts.some((attempt) => ["queued", "dispatching", "uncertain"].includes(attempt.outcome));
  const created = attempts.find((attempt) => attempt.outcome === "created" && attempt.issueNodeId && attempt.issueNumber);
  if (created) {
    return { unresolved, createdIdentity: { repositoryId: created.repositoryId, repositoryNodeId: created.repositoryNodeId, issueNodeId: created.issueNodeId!, issueNumber: created.issueNumber! } };
  }
  const source = (await database.select().from(taskIssueSources).where(eq(taskIssueSources.taskId, taskId)).limit(1))[0];
  if (!source) return { unresolved, createdIdentity: null };
  return { unresolved, createdIdentity: { repositoryId: source.repositoryId, repositoryNodeId: source.repositoryNodeId, issueNodeId: source.issueNodeId, issueNumber: source.issueNumber } };
}

export async function taskFacts(database: Database, projectId: string, taskId: string) {
  const task = (await database.select().from(tasks).where(and(eq(tasks.projectId, projectId), eq(tasks.id, taskId))).limit(1))[0];
  if (!task) return null;
  const [source] = await database.select({ issueNodeId: taskIssueSources.issueNodeId, issueNumber: taskIssueSources.issueNumber }).from(taskIssueSources).where(eq(taskIssueSources.taskId, taskId)).limit(1);
  const attempts = await database.select({ outcome: taskPublicationAttempts.outcome }).from(taskPublicationAttempts).where(eq(taskPublicationAttempts.taskId, taskId));
  const [pending] = await database.select({ id: issueDeletionOperations.id }).from(issueDeletionOperations).where(and(eq(issueDeletionOperations.taskId, taskId), sql`${issueDeletionOperations.state} <> 'completed'`)).limit(1);
  return {
    taskId: task.id,
    projectId: task.projectId,
    authorUserId: task.authorUserId,
    origin: task.origin as "flow_dev" | "external",
    status: task.status,
    title: task.title,
    repositoryId: task.repositoryId,
    repositoryNodeId: task.repositoryNodeId,
    issueNodeId: source?.issueNodeId ?? null,
    issueNumber: source?.issueNumber ?? null,
    publicationOutcomes: attempts.map((attempt) => attempt.outcome),
    pendingDeletion: Boolean(pending),
  };
}

export async function remainingActiveWork(database: Database, taskId: string) {
  const operations = await database.select({ id: taskOperations.id }).from(taskOperations).where(and(eq(taskOperations.taskId, taskId), inArray(taskOperations.state, CANCELABLE_STATES)));
  const runs = await database.select({ id: taskExecutionRuns.id }).from(taskExecutionRuns).where(and(eq(taskExecutionRuns.taskId, taskId), inArray(taskExecutionRuns.state, ACTIVE_RUN_STATES)));
  const specs = await database.select({ id: taskSpecAttempts.id }).from(taskSpecAttempts).where(and(sql`${taskSpecAttempts.workflowId} in (select id from task_spec_workflows where task_id = ${taskId})`, inArray(taskSpecAttempts.state, ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"])));
  return { operations: operations.map((row) => row.id), runs: runs.map((row) => row.id), specs: specs.map((row) => row.id) };
}

