import { afterEach, describe, expect, it } from "vitest";
import { taskSessionPlanItemDependencies } from "../src/infra/database/schema";
import { draft, rejection, seedItemSession, seedStoredPlan, seedTaskSet } from "./plan-support";
import { closeTaskFixture } from "./task-api-support";
import { taskSetWorld } from "./task-set-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const FLAT = { ids: ["task_01", "task_02", "task_03"] };

describe("tasks.plan.save with empty sessions and conditions", () => {
  it("V-03c saves an empty session and a condition on sessions created in the same save", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, FLAT);
    const { caller } = world.harness;
    await caller.plan.save({ ...world.scope, version: 0, items: [draft(["task_01"]), draft([]), draft(["task_02"], { after: [1, 2] })] });
    const view = await caller.plan.get(world.scope);
    const [first, second, third] = view.items;
    expect(second).toMatchObject({ taskIds: [], state: "empty", after: [] });
    expect(third!.after).toEqual([first!.id, second!.id]);
    expect(view.unassigned).toEqual(["task_03"]);
  });

  it("V-03d keeps the condition pointing to the same session after a reorder", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, FLAT);
    const { caller } = world.harness;
    await caller.plan.save({ ...world.scope, version: 0, items: [draft(["task_01"]), draft(["task_02"]), draft(["task_03"], { after: [1] })] });
    const [first, second, third] = (await caller.plan.get(world.scope)).items;
    const reordered = [draft(["task_01"], { id: first!.id }), draft(["task_03"], { id: third!.id, after: [1] }), draft(["task_02"], { id: second!.id })];
    await caller.plan.save({ ...world.scope, version: 1, items: reordered });
    const view = await caller.plan.get(world.scope);
    expect(view.items.map((item) => [item.id, item.after])).toEqual([[first!.id, []], [third!.id, [first!.id]], [second!.id, []]]);
  });

  it("V-03e drops the condition when the session it pointed to is removed", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, FLAT);
    const { caller } = world.harness;
    await caller.plan.save({ ...world.scope, version: 0, items: [draft(["task_01"]), draft(["task_02"]), draft(["task_03"], { after: [2] })] });
    const [first, , third] = (await caller.plan.get(world.scope)).items;
    await caller.plan.save({ ...world.scope, version: 1, items: [draft(["task_01"], { id: first!.id }), draft(["task_03"], { id: third!.id })] });
    expect((await caller.plan.get(world.scope)).items.map((item) => item.after)).toEqual([[], []]);
    expect(await world.setup.database.select().from(taskSessionPlanItemDependencies)).toEqual([]);
  });

  it("V-03f keeps a session that the operator emptied and lists its tasks as unassigned", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, FLAT);
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }, { taskIds: ["task_02", "task_03"] }] });
    const { caller } = world.harness;
    await caller.plan.save({ ...world.scope, version: 1, items: [draft(["task_01"], { id: items[0]!.id }), draft([], { id: items[1]!.id })] });
    const view = await caller.plan.get(world.scope);
    expect(view.items.map((item) => [item.id, item.taskIds])).toEqual([[items[0]!.id, ["task_01"]], [items[1]!.id, []]]);
    expect(view.unassigned).toEqual(["task_02", "task_03"]);
  });

  it("V-03g refuses to change the condition of a started session and saves nothing", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, FLAT);
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }, { taskIds: ["task_02"] }] });
    await seedItemSession(world, { itemId: items[1]!.id, status: "running" });
    const { caller } = world.harness;
    const changed = rejection(caller.plan.save({ ...world.scope, version: 1, items: [draft(["task_01"], { id: items[0]!.id }), draft(["task_02"], { id: items[1]!.id, after: [1] })] }));
    expect(await changed).toEqual({ code: "CONFLICT", message: "Uma sessão já iniciada não pode ser alterada nem removida.", reason: "plan_item_started" });
    expect((await caller.plan.get(world.scope)).version).toBe(1);
  });
});
