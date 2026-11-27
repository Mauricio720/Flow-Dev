import { asc, eq } from "drizzle-orm";
import type { ExecutionPlanDao, ForcedMark, SavePlanInput, SavePlanResult } from "../../../../application/database/dao/executionPlanDao";
import type { StoredPlan, StoredPlanItem } from "../../../../application/services/tasks-set/planTypes";
import type { SessionAgent } from "../../../../application/terminal/sessionAgentCatalog";
import type { Database } from "../../client";
import { taskSessionPlanItems, taskSessionPlans, users } from "../../schema";
import { latestItemSessions } from "./planItemSessions";
import { dependenciesOf } from "./planItemDependencies";
import { savePlan } from "./drizzlePlanSave";
import { savedManifestGraph } from "./savedManifestGraph";

export class DrizzleExecutionPlanDao implements ExecutionPlanDao {
  constructor(private readonly database: Database) {}

  async find(taskId: string): Promise<StoredPlan | null> {
    const [plan] = await this.database.select().from(taskSessionPlans).where(eq(taskSessionPlans.taskId, taskId)).limit(1);
    if (!plan) return null;
    const [items, savedGraph] = await Promise.all([this.items(plan.id), savedManifestGraph(this.database, { taskId, folder: plan.tasksFolder, version: plan.manifestVersion })]);
    return { id: plan.id, version: plan.version, tasksFolder: plan.tasksFolder, manifestVersion: plan.manifestVersion, savedGraph, items };
  }

  save(input: SavePlanInput): Promise<SavePlanResult> {
    return savePlan(this.database, input);
  }

  async markForced(input: ForcedMark) {
    await this.database.update(taskSessionPlanItems).set({ forcedBy: input.by, forcedAt: input.at }).where(eq(taskSessionPlanItems.id, input.itemId));
  }

  private async items(planId: string): Promise<StoredPlanItem[]> {
    const rows = await this.database.select({ item: taskSessionPlanItems, forcedName: users.name }).from(taskSessionPlanItems).leftJoin(users, eq(users.id, taskSessionPlanItems.forcedBy)).where(eq(taskSessionPlanItems.planId, planId)).orderBy(asc(taskSessionPlanItems.position));
    const ids = rows.map((row) => row.item.id);
    const [sessions, after] = await Promise.all([latestItemSessions(this.database, ids), dependenciesOf(this.database, ids)]);
    return rows.map(({ item, forcedName }) => {
      const session = sessions.get(item.id);
      const forced = item.forcedAt ? { by: forcedName ?? "", at: item.forcedAt } : null;
      return { id: item.id, position: item.position, taskIds: item.taskIds, choice: { agent: item.agent as SessionAgent, model: item.model, effort: item.effort }, after: after.get(item.id) ?? [], forced, started: session?.started ?? false, latestSession: session ? { id: session.id, status: session.status } : null };
    });
  }
}
