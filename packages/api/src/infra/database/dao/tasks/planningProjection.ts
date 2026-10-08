import { and, desc, eq, ne } from "drizzle-orm";
import type { PlanningDecisionRecord, PlanningProjectionRecord } from "../../../../application/database/dao/taskPlanningDao";
import type { PlanningRoute, PlanningStatus } from "../../../../application/services/tasks/planningContracts";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskIssueClaims, taskIssueSources, taskOperations, taskPlanningDecisions, taskPublicationAttempts, tasks } from "../../schema";
import type { Database } from "../../client";
import { loadSource } from "../assigned-issues/sourceRecords";
import { planningSourceRecord } from "./planningSourceRecord";

const HISTORY_LIMIT = 20;

export async function readPlanningProjection(database: Database, taskId: string): Promise<PlanningProjectionRecord> {
  const task = (await database.select().from(tasks).where(eq(tasks.id, taskId)).limit(1))[0];
  if (!task) throw new TaskError("task_unavailable");
  const [operation, decision, publication, source] = await Promise.all([findOperation(database, task.planningOperationId), findDecision(database, task), findPublication(database, taskId), findSource(database, taskId)]);
  const history = decision ? await findHistory(database, taskId, decision.id) : [];
  const retained = publication && { taskId, outcome: publication.outcome, repositoryBindingMatches: publication.repositoryId === task.repositoryId && publication.repositoryNodeId === task.repositoryNodeId, attemptId: publication.id, repositoryId: publication.repositoryId, repositoryNodeId: publication.repositoryNodeId, issueId: publication.issueId ?? "", issueNumber: publication.issueNumber ?? 0, title: publication.titleSnapshot, bodyMarkdown: publication.bodySnapshot, issueUrl: publication.issueUrl ?? "" };
  return { taskStatus: task.status, planningStatus: task.planningStatus as PlanningStatus | null, operation, decision, publication: retained ?? null, source, history };
}

async function findOperation(database: Database, operationId: string | null) {
  if (!operationId) return null;
  const row = (await database.select().from(taskOperations).where(eq(taskOperations.id, operationId)).limit(1))[0];
  return row ? { id: row.id, state: row.state, createdAt: row.createdAt, lastError: row.lastError, nextRunAt: row.nextRunAt, attempts: row.attempts } : null;
}

async function findDecision(database: Database, task: typeof tasks.$inferSelect): Promise<PlanningDecisionRecord | null> {
  const where = task.planningDecisionId ? eq(taskPlanningDecisions.id, task.planningDecisionId) : eq(taskPlanningDecisions.taskId, task.id);
  const row = (await database.select().from(taskPlanningDecisions).where(where).orderBy(desc(taskPlanningDecisions.createdAt)).limit(1))[0];
  if (!row) return null;
  return { ...row, recommendedRoute: row.recommendedRoute as PlanningRoute, selectedRoute: row.selectedRoute as PlanningRoute, complexity: row.complexity as "low", decisionSource: row.decisionSource as "AI", status: row.status as "review" };
}

async function findHistory(database: Database, taskId: string, currentId: string) {
  const rows = await database.select().from(taskPlanningDecisions).where(and(eq(taskPlanningDecisions.taskId, taskId), ne(taskPlanningDecisions.id, currentId))).orderBy(desc(taskPlanningDecisions.createdAt)).limit(HISTORY_LIMIT);
  return rows.map((row) => ({ id: row.id, version: row.version, status: row.status as "review" | "approved", selectedRoute: row.selectedRoute as PlanningRoute, sourceSnapshotId: row.sourceSnapshotId, createdAt: row.createdAt }));
}

function findPublication(database: Database, taskId: string) {
  return database.select().from(taskPublicationAttempts).where(and(eq(taskPublicationAttempts.taskId, taskId), eq(taskPublicationAttempts.outcome, "created"))).limit(1).then((rows) => rows[0] ?? null);
}

async function findSource(database: Database, taskId: string) {
  const source = await loadSource(database, eq(taskIssueSources.taskId, taskId));
  if (!source) return null;
  const claim = (await database.select().from(taskIssueClaims).where(eq(taskIssueClaims.taskId, taskId)).limit(1))[0] ?? null;
  return planningSourceRecord(source, claim);
}
