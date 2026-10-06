import { and, desc, eq, sql } from "drizzle-orm";
import type { SpecSnapshotRecord } from "../../../../application/database/dao/taskSpecDao";
import type { SpecRoute, SpecStage, SpecState } from "../../../../application/services/spec/specContracts";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecApprovals, taskSpecAttempts, taskSpecEvents, taskSpecInteractions, taskSpecPackages, taskSpecStages, taskSpecWorkflows, tasks } from "../../schema";
import type { Database } from "../../client";
import { readPlanningProjection } from "../tasks/planningProjection";

const PENDING_STATUS = "pending";

export async function readSpecSnapshot(database: Database, scope: { projectId: string; taskId: string }): Promise<SpecSnapshotRecord> {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    const task = (await db.select().from(tasks).where(and(eq(tasks.projectId, scope.projectId), eq(tasks.id, scope.taskId))).limit(1))[0];
    if (!task) throw new TaskError("spec_unavailable");
    const planning = await readPlanningProjection(db, task.id);
    const workflow = (await db.select().from(taskSpecWorkflows).where(eq(taskSpecWorkflows.taskId, task.id)).limit(1))[0] ?? null;
    const base = { eligibility: { taskStatus: planning.taskStatus, publication: planning.publication, planning: planning.decision && { status: planning.decision.status, selectedRoute: planning.decision.selectedRoute } }, taskAuthorUserId: task.authorUserId, planning };
    if (!workflow) return { ...base, workflow: null, stages: [], attempt: null, interactions: [], packageCount: 0, latestEventSequence: 0 };
    return { ...base, ...(await readWorkflowParts(db, workflow)) };
  }, { isolationLevel: "repeatable read" });
}

async function readWorkflowParts(db: Database, workflow: typeof taskSpecWorkflows.$inferSelect) {
  const [stages, attempt, packages, events, approvals] = await Promise.all([
    db.select().from(taskSpecStages).where(eq(taskSpecStages.workflowId, workflow.id)),
    db.select().from(taskSpecAttempts).where(eq(taskSpecAttempts.workflowId, workflow.id)).orderBy(desc(taskSpecAttempts.attemptNumber)).limit(1),
    db.select({ count: sql<number>`count(*)::int` }).from(taskSpecPackages).where(eq(taskSpecPackages.workflowId, workflow.id)),
    db.select({ latest: sql<number>`coalesce(max(${taskSpecEvents.sequence}), 0)::int` }).from(taskSpecEvents).where(eq(taskSpecEvents.workflowId, workflow.id)),
    db.select().from(taskSpecApprovals).where(eq(taskSpecApprovals.workflowId, workflow.id)),
  ]);
  const latest = attempt[0] ?? null;
  const interactions = latest ? await pendingInteractions(db, latest.id) : [];
  return {
    workflow: { id: workflow.id, authorUserId: workflow.authorUserId, selectedRoute: workflow.selectedRoute as SpecRoute, version: workflow.version, currentStage: workflow.currentStage as SpecStage, state: workflow.state as SpecState },
    stages: stages.map((row) => ({ stage: row.stage as SpecStage, state: row.state as SpecState, currentAttemptId: row.currentAttemptId, currentPackageId: row.currentPackageId, approvedPackageId: row.approvedPackageId, version: row.version, approval: approvals.find((item) => item.stage === row.stage) ? { approverUserId: approvals.find((item) => item.stage === row.stage)!.approverUserId, approvedAt: approvals.find((item) => item.stage === row.stage)!.approvedAt } : null })),
    attempt: latest && { id: latest.id, stage: latest.stage as SpecStage, attemptNumber: latest.attemptNumber, kind: latest.kind, state: latest.state, terminalReason: latest.terminalReason, createdAt: latest.createdAt },
    interactions,
    packageCount: packages[0]?.count ?? 0,
    latestEventSequence: events[0]?.latest ?? 0,
  };
}

async function pendingInteractions(db: Database, attemptId: string) {
  const rows = await db.select().from(taskSpecInteractions).where(and(eq(taskSpecInteractions.attemptId, attemptId), eq(taskSpecInteractions.status, PENDING_STATUS)));
  return rows.map((row) => ({ id: row.id, attemptId: row.attemptId, kind: row.kind, description: row.description, choices: row.choices, targetDigest: row.targetDigest, delivery: row.delivery }));
}
