import { and, eq, sql } from "drizzle-orm";
import { PlanningDomainError } from "../../../../application/services/tasks/planningContracts";
import { PLANNING_SOURCE_FORMAT_VERSION, buildSourcePlanningInput } from "../../../../application/services/tasks/planningSourceInput";
import { assertRetryable, assertStartable, assertVersion } from "../../../../application/services/tasks/planningTransitions";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import type { PlanningCommandResult, PlanningCommandTarget } from "../../../../application/database/dao/taskPlanningDao";
import { taskIssueSources, taskOperations, tasks } from "../../schema";
import type { Database } from "../../client";
import { loadSource } from "../assigned-issues/sourceRecords";
import { findPlanningReplay, findPlanningTask, savePlanningReceipt } from "./planningReceiptHelpers";
import { requirePlanningOperator } from "./planningOperatorGuard";

const MAX_REQUESTER_ACTIVE = 5;
const MAX_GLOBAL_ACTIVE = 100;
const ADMISSION_RETRY_SECONDS = 30;

type AcceptInput = PlanningCommandTarget & { expectedVersion: number; sessionId: string; beforeAccept?: () => void };
type RetryInput = AcceptInput & { failedOperationId: string };
type PlanningTaskRow = Awaited<ReturnType<typeof findPlanningTask>>;

export function acceptPlanningStart(database: Database, input: AcceptInput) {
  return accept(database, input, "planning.start", (task) => assertStartable(task, input));
}

export function acceptPlanningRetry(database: Database, input: RetryInput) {
  return accept(database, input, "planning.retry", async (task, db) => {
    assertVersion(task, input);
    assertRetryable(task, await latestOperation(db, task), input.failedOperationId);
  });
}

async function accept(database: Database, input: AcceptInput, action: string, assertState: (task: PlanningTaskRow, db: Database) => void | Promise<void>): Promise<PlanningCommandResult> {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    const task = await findPlanningTask(db, input);
    await requirePlanningOperator(db, { taskId: task.id, actorUserId: input.actorUserId });
    const replay = await findPlanningReplay(db, input, action);
    if (replay) return { ...replay, replayed: true };
    await assertState(task, db);
    input.beforeAccept?.();
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('planning-admission', 1))`);
    await assertAdmission(db, input.actorUserId);
    const operationId = await insertOperation(db, { task, input });
    const receipt = { taskId: task.id, operationId, decisionId: null, version: task.version + 1, decisionVersion: null };
    await tx.update(tasks).set({ planningStatus: "in_progress", planningOperationId: operationId, activeOperationId: operationId, lastError: null, version: receipt.version, updatedAt: new Date() }).where(and(eq(tasks.id, task.id), eq(tasks.version, task.version)));
    await savePlanningReceipt(db, input, action, receipt);
    return { ...receipt, replayed: false };
  });
}

async function insertOperation(db: Database, input: { task: PlanningTaskRow; input: AcceptInput }) {
  const { task } = input;
  const source = await loadSource(db, eq(taskIssueSources.taskId, task.id));
  if (!source) throw new TaskError("publication_required");
  const operationId = crypto.randomUUID();
  const planning = buildSource(source, { taskId: task.id, operationId });
  await db.insert(taskOperations).values({ id: operationId, taskId: task.id, kind: "plan", state: "queued", initiatedSessionId: input.input.sessionId, baseTaskVersion: task.version, sourceSnapshotId: source.snapshot.id, requesterUserId: input.input.actorUserId, sourceFormatVersion: PLANNING_SOURCE_FORMAT_VERSION, inputHash: planning.inputHash });
  return operationId;
}

function buildSource(source: NonNullable<Awaited<ReturnType<typeof loadSource>>>, ids: { taskId: string; operationId: string }) {
  try {
    return buildSourcePlanningInput({ snapshotId: source.snapshot.id, repositoryId: source.identity.repositoryId, repositoryNodeId: source.identity.repositoryNodeId, issueNodeId: source.identity.issueNodeId, issueNumber: source.issueNumber, title: source.snapshot.title, bodyMarkdown: source.snapshot.bodyMarkdown }, { ...ids, executionId: crypto.randomUUID() });
  } catch (error) {
    if (error instanceof PlanningDomainError) throw new TaskError(error.reason);
    throw error;
  }
}

async function latestOperation(database: Database, task: { planningOperationId: string | null }) {
  if (!task.planningOperationId) return null;
  return (await database.select({ id: taskOperations.id, state: taskOperations.state }).from(taskOperations).where(eq(taskOperations.id, task.planningOperationId)).limit(1))[0] ?? null;
}

async function assertAdmission(database: Database, requesterUserId: string) {
  const rows = await database.select({ requesterUserId: taskOperations.requesterUserId }).from(taskOperations).where(and(eq(taskOperations.kind, "plan"), sql`${taskOperations.state} in ('queued','running')`));
  const requesterCount = rows.filter((row) => row.requesterUserId === requesterUserId).length;
  if (requesterCount >= MAX_REQUESTER_ACTIVE || rows.length >= MAX_GLOBAL_ACTIVE) throw new TaskError("planning_capacity", undefined, undefined, ADMISSION_RETRY_SECONDS);
}
