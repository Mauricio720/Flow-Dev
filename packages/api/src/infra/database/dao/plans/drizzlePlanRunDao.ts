import { and, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { NewPlanRun, PlanRunDao, PlanRunRecord, PlanRunRestart, PlanRunState, PlanRunTransition } from "../../../../application/database/dao/planRunDao";
import type { Database } from "../../client";
import { taskSessionPlanRuns, taskSessionPlans, tasks, users } from "../../schema";

const RUNNING: PlanRunState = "running";

type RunValues = { [Key in keyof typeof taskSessionPlanRuns.$inferInsert]?: (typeof taskSessionPlanRuns.$inferInsert)[Key] | SQL };

export class DrizzlePlanRunDao implements PlanRunDao {
  constructor(private readonly database: Database) {}

  findByPlan(planId: string) {
    return this.findWhere(eq(taskSessionPlanRuns.planId, planId));
  }

  findByRequestKey(actorId: string, requestKey: string) {
    return this.findWhere(and(eq(taskSessionPlanRuns.startedBy, actorId), eq(taskSessionPlanRuns.requestKey, requestKey)));
  }

  async create(input: NewPlanRun) {
    const [row] = await this.database.insert(taskSessionPlanRuns).values(input).returning({ id: taskSessionPlanRuns.id });
    return (await this.findWhere(eq(taskSessionPlanRuns.id, row!.id)))!;
  }

  async restart(input: PlanRunRestart) {
    const values = { state: RUNNING, hostId: input.hostId, startedBy: input.startedBy, requestKey: input.requestKey, pauseReason: null, pausedBy: null, currentItemId: null, currentSessionId: null, resumeCount: sql`${taskSessionPlanRuns.resumeCount} + 1` };
    return this.update(input, values);
  }

  transition(input: PlanRunTransition) {
    return this.update(input, input.next);
  }

  private async update(input: { runId: string; revision: number }, values: RunValues) {
    const where = and(eq(taskSessionPlanRuns.id, input.runId), eq(taskSessionPlanRuns.revision, input.revision));
    const [row] = await this.database.update(taskSessionPlanRuns).set({ ...values, updatedAt: new Date(), revision: sql`${taskSessionPlanRuns.revision} + 1` }).where(where).returning({ id: taskSessionPlanRuns.id });
    return row ? this.findWhere(eq(taskSessionPlanRuns.id, row.id)) : null;
  }

  private async findWhere(where: ReturnType<typeof eq> | undefined): Promise<PlanRunRecord | null> {
    const [row] = await this.database.select({ run: taskSessionPlanRuns, taskId: tasks.id, projectId: tasks.projectId, pausedByName: users.name }).from(taskSessionPlanRuns).innerJoin(taskSessionPlans, eq(taskSessionPlans.id, taskSessionPlanRuns.planId)).innerJoin(tasks, eq(tasks.id, taskSessionPlans.taskId)).leftJoin(users, eq(users.id, taskSessionPlanRuns.pausedBy)).where(where).limit(1);
    if (!row) return null;
    return { ...row.run, state: row.run.state as PlanRunState, taskId: row.taskId, projectId: row.projectId, pausedByName: row.pausedByName };
  }
}
