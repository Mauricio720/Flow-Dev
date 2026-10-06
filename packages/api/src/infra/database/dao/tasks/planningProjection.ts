import { and, eq } from "drizzle-orm";
import type { PlanningDecisionRecord, PlanningProjectionRecord } from "../../../../application/database/dao/taskPlanningDao";
import type { PlanningRoute, PlanningStatus } from "../../../../application/services/tasks/planningContracts";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskOperations, taskPlanningDecisions, taskPublicationAttempts, tasks } from "../../schema";
import type { Database } from "../../client";

export async function readPlanningProjection(database: Database, taskId: string): Promise<PlanningProjectionRecord> {
  const task = (await database.select().from(tasks).where(eq(tasks.id, taskId)).limit(1))[0];
  if (!task) throw new TaskError("task_unavailable");
  const [operation, decision, publication] = await Promise.all([findOperation(database, task.planningOperationId), findDecision(database, taskId), findPublication(database, taskId)]);
  const retained = publication && { taskId, outcome: publication.outcome, repositoryBindingMatches: publication.repositoryId === task.repositoryId && publication.repositoryNodeId === task.repositoryNodeId, attemptId: publication.id, repositoryId: publication.repositoryId, repositoryNodeId: publication.repositoryNodeId, issueId: publication.issueId ?? "", issueNumber: publication.issueNumber ?? 0, issueUrl: publication.issueUrl ?? "", title: publication.titleSnapshot, bodyMarkdown: publication.bodySnapshot };
  return { taskStatus: task.status, planningStatus: task.planningStatus as PlanningStatus | null, operation, decision, publication: retained ?? null };
}

async function findOperation(database: Database, operationId: string | null) {
  if (!operationId) return null;
  const row = (await database.select().from(taskOperations).where(eq(taskOperations.id, operationId)).limit(1))[0];
  return row ? { id: row.id, state: row.state, createdAt: row.createdAt, lastError: row.lastError, nextRunAt: row.nextRunAt, attempts: row.attempts } : null;
}

async function findDecision(database: Database, taskId: string): Promise<PlanningDecisionRecord | null> {
  const row = (await database.select().from(taskPlanningDecisions).where(eq(taskPlanningDecisions.taskId, taskId)).limit(1))[0];
  if (!row) return null;
  return { ...row, recommendedRoute: row.recommendedRoute as PlanningRoute, selectedRoute: row.selectedRoute as PlanningRoute, complexity: row.complexity as "low", decisionSource: row.decisionSource as "AI", status: row.status as "review" };
}

function findPublication(database: Database, taskId: string) {
  return database.select().from(taskPublicationAttempts).where(and(eq(taskPublicationAttempts.taskId, taskId), eq(taskPublicationAttempts.outcome, "created"))).limit(1).then((rows) => rows[0] ?? null);
}
