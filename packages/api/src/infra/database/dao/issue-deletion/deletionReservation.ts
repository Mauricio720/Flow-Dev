import { and, eq, sql } from "drizzle-orm";
import { issueDeletionOperations, taskIssueSources, tasks } from "../../schema";
import type { Database } from "../../client";
import type { DeletionReservation, ReserveDeletionInput } from "../../../../application/database/dao/issueDeletionDao";
import { IssueDeletionError } from "../../../../application/services/issue-deletion/issueDeletionErrors";
import { lockIdentity } from "../assigned-issues/identityLock";
import { isUniqueViolation } from "../projects/projectRecordMapper";
import { mapOperation } from "./deletionRecords";

export async function reserveDeletion(database: Database, input: ReserveDeletionInput) {
  return database.transaction(async (raw) => {
    const tx = raw as unknown as Database;
    if (input.reservation.kind === "queue") {
      const identity = { projectId: input.reservation.projectId, repositoryId: input.reservation.repositoryId, repositoryNodeId: input.reservation.repositoryNodeId, issueNodeId: input.reservation.issueNodeId };
      await lockIdentity(tx, identity);
    }
    const existing = await boundOperation(tx, input);
    if (existing) {
      const attached = await attachQueueTask(tx, existing, input);
      return { operation: mapOperation(attached), created: false };
    }
    if (input.reservation.kind === "task") {
      const task = (await tx.select({ id: tasks.id, projectId: tasks.projectId }).from(tasks).where(and(eq(tasks.id, input.reservation.taskId), eq(tasks.projectId, input.reservation.projectId))).limit(1).for("update"))[0];
      if (!task) throw new IssueDeletionError("target_unavailable");
    }
    const row = await insertReservation(tx, input);
    const attached = await attachQueueTask(tx, row, input);
    return { operation: mapOperation(attached), created: true };
  });
}

async function attachQueueTask(database: Database, operation: typeof issueDeletionOperations.$inferSelect, input: ReserveDeletionInput) {
  if (input.reservation.kind !== "queue" || operation.taskId) return operation;
  const [source] = await database.select({ taskId: taskIssueSources.taskId }).from(taskIssueSources).where(and(
    eq(taskIssueSources.projectId, input.reservation.projectId),
    eq(taskIssueSources.repositoryId, input.reservation.repositoryId),
    eq(taskIssueSources.issueNodeId, input.reservation.issueNodeId),
  )).limit(1);
  if (!source) return operation;
  const [updated] = await database.update(issueDeletionOperations).set({ taskId: source.taskId, updatedAt: new Date() }).where(and(
    eq(issueDeletionOperations.id, operation.id),
    sql`${issueDeletionOperations.taskId} is null`,
  )).returning();
  return updated ?? operation;
}

async function boundOperation(database: Database, input: ReserveDeletionInput) {
  const byKey = (await database.select().from(issueDeletionOperations).where(and(eq(issueDeletionOperations.initiatorUserId, input.initiatorUserId), eq(issueDeletionOperations.requestKey, input.requestKey))).limit(1))[0];
  if (byKey) {
    const bindsSameTarget = byKey.projectId === input.projectId
      && (input.reservation.kind === "task" ? byKey.taskId === input.reservation.taskId : byKey.issueNodeId === input.reservation.issueNodeId && byKey.taskId === null);
    if (!bindsSameTarget) throw new IssueDeletionError("request_key_reused");
    return byKey;
  }
  if (input.reservation.kind === "task") {
    return (await database.select().from(issueDeletionOperations).where(eq(issueDeletionOperations.taskId, input.reservation.taskId)).limit(1))[0] ?? null;
  }
  const identity = (await database.select().from(issueDeletionOperations).where(and(eq(issueDeletionOperations.projectId, input.reservation.projectId), eq(issueDeletionOperations.repositoryId, input.reservation.repositoryId), eq(issueDeletionOperations.issueNodeId, input.reservation.issueNodeId))).limit(1))[0];
  return identity && identity.state !== "completed" ? identity : null;
}

function reservationValues(reservation: DeletionReservation, input: ReserveDeletionInput) {
  return {
    projectId: input.projectId,
    taskId: reservation.kind === "task" ? reservation.taskId : null,
    repositoryId: reservation.repositoryId,
    repositoryNodeId: reservation.repositoryNodeId,
    issueNodeId: reservation.issueNodeId,
    issueNumber: reservation.issueNumber,
    initiatorUserId: input.initiatorUserId,
    requestKey: input.requestKey,
    state: "stopping" as const,
    remotePresence: input.remotePresence,
  };
}

async function insertReservation(database: Database, input: ReserveDeletionInput) {
  const values = reservationValues(input.reservation, input);
  try {
    const [row] = await database.insert(issueDeletionOperations).values(values).returning();
    return row!;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = (await database.select().from(issueDeletionOperations).where(and(eq(issueDeletionOperations.initiatorUserId, input.initiatorUserId), eq(issueDeletionOperations.requestKey, input.requestKey))).limit(1))[0];
    if (!existing) throw new IssueDeletionError("conflict");
    return existing;
  }
}
