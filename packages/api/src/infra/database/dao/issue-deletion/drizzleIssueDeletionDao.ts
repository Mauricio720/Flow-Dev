import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../client";
import { issueDeletionOperations, taskExecutionRuns, taskOperations, taskPublicationAttempts, taskSpecAttempts, tasks } from "../../schema";
import type { DeletionOperation, DeletionState, FrozenIssueIdentity, RemotePresence } from "../../../../application/services/issue-deletion/issueDeletionContracts";
import type { DeletionClaim, DeletionPatch, IssueDeletionDao, ReserveDeletionInput, TaskDeletionFacts } from "../../../../application/database/dao/issueDeletionDao";
import { IssueDeletionError } from "../../../../application/services/issue-deletion/issueDeletionErrors";
import { mapOperation } from "./deletionRecords";
import { reserveDeletion } from "./deletionReservation";
import { claimNextDeletion, heartbeatDeletion } from "./deletionLease";
import { purgeTaskRows } from "./deletionPurge";
import { cancelTaskWork, publicationState, remainingActiveWork, taskFacts } from "./deletionWork";

const ACTIVE_WORK_STATES = ["queued", "running", "uncertain"];
const ACTIVE_RUN_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];
const ACTIVE_SPEC_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];
const UNRESOLVED_PUBLICATION = ["queued", "dispatching", "uncertain"];
const NOT_COMPLETED = sql`${issueDeletionOperations.state} <> 'completed'`;

export class DrizzleIssueDeletionDao implements IssueDeletionDao {
  constructor(private readonly database: Database) {}

  reserve(input: ReserveDeletionInput) {
    return reserveDeletion(this.database, input);
  }

  async byId(operationId: string): Promise<DeletionOperation | null> {
    const row = (await this.database.select().from(issueDeletionOperations).where(eq(issueDeletionOperations.id, operationId)).limit(1))[0];
    return row ? mapOperation(row) : null;
  }

  async byRequestKey(initiatorUserId: string, requestKey: string): Promise<DeletionOperation | null> {
    const row = (await this.database.select().from(issueDeletionOperations).where(and(eq(issueDeletionOperations.initiatorUserId, initiatorUserId), eq(issueDeletionOperations.requestKey, requestKey))).limit(1))[0];
    return row ? mapOperation(row) : null;
  }

  async activeForTask(taskId: string): Promise<DeletionOperation | null> {
    const row = (await this.database.select().from(issueDeletionOperations).where(and(eq(issueDeletionOperations.taskId, taskId), NOT_COMPLETED)).limit(1))[0];
    return row ? mapOperation(row) : null;
  }

  async activeForIdentity(identity: { projectId: string; repositoryId: string; issueNodeId: string }): Promise<DeletionOperation | null> {
    const row = (await this.database.select().from(issueDeletionOperations).where(and(eq(issueDeletionOperations.projectId, identity.projectId), eq(issueDeletionOperations.repositoryId, identity.repositoryId), eq(issueDeletionOperations.issueNodeId, identity.issueNodeId), NOT_COMPLETED)).limit(1))[0];
    return row ? mapOperation(row) : null;
  }

  claimNext(input: { owner: string; now: Date; leaseMs: number }): Promise<DeletionClaim | null> {
    return claimNextDeletion(this.database, input);
  }

  heartbeat(input: { operationId: string; owner: string; fence: number; now: Date; leaseMs: number }): Promise<void> {
    return heartbeatDeletion(this.database, input);
  }

  async patch(input: { operationId: string; fence: number; patch: DeletionPatch }): Promise<void> {
    const values = { ...input.patch, updatedAt: new Date() };
    const updated = await this.database.update(issueDeletionOperations).set(values).where(and(eq(issueDeletionOperations.id, input.operationId), eq(issueDeletionOperations.leaseFence, input.fence))).returning({ id: issueDeletionOperations.id });
    if (!updated.length) throw new IssueDeletionError("stale_fence");
  }

  async adoptIdentity(input: { operationId: string; identity: FrozenIssueIdentity }): Promise<void> {
    const { identity } = input;
    await this.database.update(issueDeletionOperations).set({ repositoryId: identity.repositoryId, repositoryNodeId: identity.repositoryNodeId, issueNodeId: identity.issueNodeId, issueNumber: identity.issueNumber, updatedAt: new Date() }).where(and(eq(issueDeletionOperations.id, input.operationId), sql`(${issueDeletionOperations.issueNodeId} is null or ${issueDeletionOperations.issueNodeId} = ${identity.issueNodeId})`));
  }

  async purgeTaskAndComplete(input: { operationId: string; taskId: string; fence: number; expectedRemote: RemotePresence }): Promise<void> {
    await this.database.transaction(async (raw) => {
      const db = raw as unknown as Database;
      const [operation] = await db.select().from(issueDeletionOperations).where(eq(issueDeletionOperations.id, input.operationId)).limit(1).for("update");
      if (!operation) throw new IssueDeletionError("operation_unavailable");
      if (operation.leaseFence !== input.fence) throw new IssueDeletionError("stale_fence");
      if (operation.state === "completed") return;
      const task = (await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, input.taskId)).limit(1))[0];
      if (task) {
        await assertCleanupConditions(db, input.taskId, input.expectedRemote);
        await purgeTaskRows(db, input.taskId);
      }
      const now = new Date();
      await db.update(issueDeletionOperations).set({ state: "completed", leaseOwner: null, leaseUntil: null, reason: null, retryAt: null, completedAt: now, updatedAt: now }).where(eq(issueDeletionOperations.id, input.operationId));
    });
  }

  async completeQueueOnly(input: { operationId: string; fence: number }): Promise<void> {
    await this.database.transaction(async (raw) => {
      const db = raw as unknown as Database;
      const [operation] = await db.select().from(issueDeletionOperations).where(eq(issueDeletionOperations.id, input.operationId)).limit(1).for("update");
      if (!operation) throw new IssueDeletionError("operation_unavailable");
      if (operation.leaseFence !== input.fence) throw new IssueDeletionError("stale_fence");
      if (operation.state === "completed") return;
      const now = new Date();
      await db.update(issueDeletionOperations).set({ state: "completed", leaseOwner: null, leaseUntil: null, reason: null, retryAt: null, completedAt: now, updatedAt: now }).where(eq(issueDeletionOperations.id, input.operationId));
    });
  }

  async pending(limit: number): Promise<DeletionOperation[]> {
    const rows = await this.database.select().from(issueDeletionOperations).where(NOT_COMPLETED).limit(limit);
    return rows.map(mapOperation);
  }

  async activeFenceState(taskId: string): Promise<DeletionState | null> {
    const row = (await this.database.select({ state: issueDeletionOperations.state }).from(issueDeletionOperations).where(and(eq(issueDeletionOperations.taskId, taskId), NOT_COMPLETED)).limit(1))[0];
    return row ? row.state as DeletionState : null;
  }

  async taskFacts(projectId: string, taskId: string): Promise<TaskDeletionFacts | null> {
    return taskFacts(this.database, projectId, taskId);
  }

  cancelTaskWork(taskId: string, deletionOperationId: string) {
    return cancelTaskWork(this.database, taskId, deletionOperationId);
  }

  publicationState(taskId: string) {
    return publicationState(this.database, taskId);
  }

  remainingActiveWork(taskId: string) {
    return remainingActiveWork(this.database, taskId);
  }

  async resume(input: { operationId: string; state: DeletionState }): Promise<DeletionOperation> {
    await this.database.update(issueDeletionOperations).set({ state: input.state, leaseOwner: null, leaseUntil: null, leaseFence: sql`${issueDeletionOperations.leaseFence} + 1`, updatedAt: new Date() }).where(and(eq(issueDeletionOperations.id, input.operationId), eq(issueDeletionOperations.state, "recoverable")));
    const row = (await this.database.select().from(issueDeletionOperations).where(eq(issueDeletionOperations.id, input.operationId)).limit(1))[0];
    if (!row) throw new IssueDeletionError("operation_unavailable");
    return mapOperation(row);
  }
}

async function assertCleanupConditions(db: Database, taskId: string, expectedRemote: RemotePresence) {
  const [operation] = await db.select({ id: issueDeletionOperations.id, remotePresence: issueDeletionOperations.remotePresence }).from(issueDeletionOperations).where(eq(issueDeletionOperations.taskId, taskId));
  if (operation && operation.remotePresence !== expectedRemote) throw new IssueDeletionError("unknown_remote_outcome");
  const [task] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId));
  if (task) {
    const [active] = await db.select({ id: taskOperations.id }).from(taskOperations).where(and(eq(taskOperations.taskId, taskId), inArray(taskOperations.state, ACTIVE_WORK_STATES))).limit(1);
    if (active) throw new IssueDeletionError("unknown_stop");
    const [activeRun] = await db.select({ id: taskExecutionRuns.id }).from(taskExecutionRuns).where(and(eq(taskExecutionRuns.taskId, taskId), inArray(taskExecutionRuns.state, ACTIVE_RUN_STATES))).limit(1);
    if (activeRun) throw new IssueDeletionError("unknown_stop");
    const [activeSpec] = await db.select({ id: taskSpecAttempts.id }).from(taskSpecAttempts).where(and(sql`${taskSpecAttempts.workflowId} in (select id from task_spec_workflows where task_id = ${taskId})`, inArray(taskSpecAttempts.state, ACTIVE_SPEC_STATES))).limit(1);
    if (activeSpec) throw new IssueDeletionError("unknown_stop");
    const [unresolved] = await db.select({ id: taskPublicationAttempts.id }).from(taskPublicationAttempts).where(and(eq(taskPublicationAttempts.taskId, taskId), inArray(taskPublicationAttempts.outcome, UNRESOLVED_PUBLICATION))).limit(1);
    if (unresolved) throw new IssueDeletionError("uncertain_publication");
  }
}
