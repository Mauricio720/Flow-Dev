import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { Database } from "../../client";
import { taskCompozyExecutions, taskPlanningDecisions } from "../../schema";
import type { DispatchInsert, ExecutionTransition, TaskExecutionDao } from "../../../../application/database/dao/taskExecutionDao";
import type { PlanningRoute } from "../../../../application/services/tasks/planningContracts";
import { toExecution } from "./executionRows";

const DISPATCHING_STATE = "dispatching";
const HISTORY_LIMIT = 10;

export class DrizzleTaskExecutionDao implements TaskExecutionDao {
  constructor(private readonly database: Database) {}

  async latestDecision(taskId: string) {
    const [row] = await this.database.select().from(taskPlanningDecisions).where(eq(taskPlanningDecisions.taskId, taskId)).orderBy(desc(taskPlanningDecisions.createdAt)).limit(1);
    return row ? { id: row.id, version: row.version, status: row.status, selectedRoute: row.selectedRoute as PlanningRoute, uncertainties: row.uncertainties, summary: row.summary, reasons: row.reasons } : null;
  }

  async findByRequest(taskId: string, idempotencyKey: string) {
    const [row] = await this.database.select().from(taskCompozyExecutions).where(and(eq(taskCompozyExecutions.taskId, taskId), eq(taskCompozyExecutions.idempotencyKey, idempotencyKey))).limit(1);
    return row ? toExecution(row) : null;
  }

  async findById(taskId: string, executionId: string) {
    const [row] = await this.database.select().from(taskCompozyExecutions).where(and(eq(taskCompozyExecutions.taskId, taskId), eq(taskCompozyExecutions.id, executionId))).limit(1);
    return row ? toExecution(row) : null;
  }

  async current(taskId: string) {
    const [row] = await this.database.select().from(taskCompozyExecutions).where(eq(taskCompozyExecutions.taskId, taskId)).orderBy(desc(taskCompozyExecutions.createdAt)).limit(1);
    return row ? toExecution(row) : null;
  }

  async history(taskId: string, excludeId: string | null) {
    const exclude = excludeId ? ne(taskCompozyExecutions.id, excludeId) : undefined;
    const rows = await this.database.select().from(taskCompozyExecutions).where(and(eq(taskCompozyExecutions.taskId, taskId), exclude)).orderBy(desc(taskCompozyExecutions.createdAt)).limit(HISTORY_LIMIT);
    return rows.map(toExecution);
  }

  async insertDispatching(insert: DispatchInsert) {
    const nextAttempt = sql<number>`(select coalesce(max(${taskCompozyExecutions.attempt}), 0) + 1 from ${taskCompozyExecutions} where ${taskCompozyExecutions.planningDecisionId} = ${insert.planningDecisionId})`;
    const [row] = await this.database.insert(taskCompozyExecutions).values({ ...insert, state: DISPATCHING_STATE, attempt: nextAttempt }).onConflictDoNothing().returning();
    return row ? toExecution(row) : null;
  }

  async transition(transition: ExecutionTransition) {
    const [row] = await this.database.update(taskCompozyExecutions).set({ ...transition.patch, updatedAt: sql`now()` }).where(and(eq(taskCompozyExecutions.id, transition.id), inArray(taskCompozyExecutions.state, transition.from))).returning();
    return row ? toExecution(row) : null;
  }
}
