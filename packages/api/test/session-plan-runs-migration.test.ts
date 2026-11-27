import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskSessionPlanItemDependencies, taskSessionPlanItems, taskSessionPlans } from "../src/infra/database/schema";
import { applyMigration } from "./database";
import { closeTaskFixture } from "./task-api-support";
import { world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

const ROLLBACK = "0058_session_plan_runs_rollback";
const OPUS = { agent: "claude", model: "opus", effort: "max" };

type World = Awaited<ReturnType<typeof world>>;

async function violated(operation: Promise<unknown>) {
  try {
    await operation;
    return null;
  } catch (error) {
    return (error as { cause?: { constraint_name?: string } }).cause?.constraint_name ?? "other";
  }
}

async function seedPlan({ setup }: Pick<World, "setup">) {
  const [plan] = await setup.database.insert(taskSessionPlans).values({ taskId: setup.taskId, tasksFolder: "docs/specs/login", manifestVersion: 1, updatedBy: setup.ownerId }).returning();
  const insert = (position: number, taskIds: string[]) => setup.database.insert(taskSessionPlanItems).values({ planId: plan!.id, position, taskIds, ...OPUS }).returning();
  return { plan: plan!, insert };
}

describe("0058 session plan runs migration", () => {
  it("V-03a accepts an empty session, keeps the task id pattern and cascades the conditions", async () => {
    const context = await world();
    const { setup } = context;
    const { insert } = await seedPlan(context);
    const [empty] = await insert(1, []);
    const [filled] = await insert(2, ["task_01"]);
    const [third] = await insert(3, ["task_02"]);
    expect(empty).toMatchObject({ taskIds: [] });
    expect(await violated(insert(4, ["task_1"]))).toBe("task_session_plan_items_task_ids_check");
    const dependencies = setup.database.insert(taskSessionPlanItemDependencies);
    expect(await violated(dependencies.values({ itemId: filled!.id, afterItemId: filled!.id }))).toBe("task_session_plan_item_dependencies_self_check");
    await setup.database.insert(taskSessionPlanItemDependencies).values([{ itemId: filled!.id, afterItemId: empty!.id }, { itemId: third!.id, afterItemId: filled!.id }]);
    await setup.database.delete(taskSessionPlanItems).where(eq(taskSessionPlanItems.id, filled!.id));
    expect(await setup.database.select().from(taskSessionPlanItemDependencies)).toEqual([]);
  });

  it("V-03b rolls back removing the empty unstarted sessions and the new tables, and keeps the others", async () => {
    const context = await world();
    const { setup } = context;
    const { insert } = await seedPlan(context);
    await insert(1, []);
    const [kept] = await insert(2, ["task_01"]);
    await applyMigration(setup.client, ROLLBACK);
    const items = await setup.database.select({ id: taskSessionPlanItems.id }).from(taskSessionPlanItems);
    const [tables] = await setup.client`select to_regclass('task_session_plan_item_dependencies') as dependencies, to_regclass('task_session_plan_runs') as runs`;
    expect(items).toEqual([{ id: kept!.id }]);
    expect(tables).toEqual({ dependencies: null, runs: null });
    expect(await violated(insert(3, []))).toBe("task_session_plan_items_task_ids_check");
  });
});
