import { and, eq, sql } from "drizzle-orm";
import { buildPlanningInput, planningEligibility } from "../../../../application/services/tasks/planningRules";
import { assertAuthorAndVersion, assertRetryable, assertStartable } from "../../../../application/services/tasks/planningTransitions";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import type { PlanningCommandResult, PlanningCommandTarget } from "../../../../application/database/dao/taskPlanningDao";
import { taskOperations, taskPublicationAttempts, tasks } from "../../schema";
import type { Database } from "../../client";
import { findPlanningReplay, findPlanningTask, savePlanningReceipt } from "./planningReceiptHelpers";

const MAX_AUTHOR_ACTIVE = 5;
const MAX_GLOBAL_ACTIVE = 100;
const ADMISSION_RETRY_SECONDS = 30;

type AcceptInput = PlanningCommandTarget & { expectedVersion: number; sessionId: string; beforeAccept?: () => void };
type RetryInput = AcceptInput & { failedOperationId: string };

export function acceptPlanningStart(database: Database, input: AcceptInput) {
  return accept(database, input, "planning.start", (task) => assertStartable(task, input));
}

export function acceptPlanningRetry(database: Database, input: RetryInput) {
  return accept(database, input, "planning.retry", async (task, db) => {
    assertAuthorAndVersion(task, input);
    assertRetryable(task, await latestOperation(db, task), input.failedOperationId);
  });
}

async function accept(database: Database, input: AcceptInput, action: string, assertState: (task: Awaited<ReturnType<typeof findPlanningTask>>, db: Database) => void | Promise<void>): Promise<PlanningCommandResult> {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    const task = await findPlanningTask(db, input);
    if (task.authorUserId !== input.actorUserId) throw new TaskError("author_required");
    const replay = await findPlanningReplay(db, input, action);
    if (replay) return { ...replay, replayed: true };
    await assertState(task, db);
    input.beforeAccept?.();
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('planning-admission', 1))`);
    await assertAdmission(db, task.authorUserId);
    const publication = await findPublication(db, task.id);
    const operationId = crypto.randomUUID();
    const planningInput = buildPlanningInput(publication, { taskId: task.id, operationId, executionId: crypto.randomUUID() });
    const receipt = { taskId: task.id, operationId, decisionId: null, version: task.version + 1, decisionVersion: null };
    await tx.insert(taskOperations).values({ id: operationId, taskId: task.id, kind: "plan", state: "queued", initiatedSessionId: input.sessionId, baseTaskVersion: task.version, publicationAttemptId: publication.attemptId, inputHash: planningInput.inputHash });
    await tx.update(tasks).set({ planningStatus: "in_progress", planningOperationId: operationId, activeOperationId: operationId, lastError: null, version: receipt.version, updatedAt: new Date() }).where(and(eq(tasks.id, task.id), eq(tasks.version, task.version)));
    await savePlanningReceipt(db, input, action, receipt);
    return { ...receipt, replayed: false };
  });
}

async function latestOperation(database: Database, task: { planningOperationId: string | null }) {
  if (!task.planningOperationId) return null;
  return (await database.select({ id: taskOperations.id, state: taskOperations.state }).from(taskOperations).where(eq(taskOperations.id, task.planningOperationId)).limit(1))[0] ?? null;
}

async function assertAdmission(database: Database, authorUserId: string) {
  const rows = await database.select({ authorUserId: tasks.authorUserId }).from(taskOperations).innerJoin(tasks, eq(taskOperations.taskId, tasks.id)).where(and(eq(taskOperations.kind, "plan"), sql`${taskOperations.state} in ('queued','running')`));
  const authorCount = rows.filter((row) => row.authorUserId === authorUserId).length;
  if (authorCount >= MAX_AUTHOR_ACTIVE || rows.length >= MAX_GLOBAL_ACTIVE) throw new TaskError("planning_capacity", undefined, undefined, ADMISSION_RETRY_SECONDS);
}

async function findPublication(database: Database, taskId: string) {
  const publication = (await database.select().from(taskPublicationAttempts).where(and(eq(taskPublicationAttempts.taskId, taskId), eq(taskPublicationAttempts.outcome, "created"))).limit(1))[0];
  if (!publication?.issueId || !publication.issueNumber || !publication.issueUrl || !publication.issueCreatedAt) throw new TaskError("publication_required");
  const task = (await database.select().from(tasks).where(eq(tasks.id, taskId)).limit(1))[0];
  if (!task) throw new TaskError("task_unavailable");
  const retained = { taskId, outcome: publication.outcome, repositoryBindingMatches: publication.repositoryId === task.repositoryId && publication.repositoryNodeId === task.repositoryNodeId, attemptId: publication.id, repositoryId: publication.repositoryId, repositoryNodeId: publication.repositoryNodeId, issueId: publication.issueId, issueNumber: publication.issueNumber, issueUrl: publication.issueUrl, title: publication.titleSnapshot, bodyMarkdown: publication.bodySnapshot };
  const eligibility = planningEligibility(retained, task.status);
  if (!eligibility.canStart) throw new TaskError(eligibility.reason ?? "publication_required");
  return retained;
}
