import { afterEach, describe, expect, it, vi } from "vitest";
import { taskSessionPlanItems } from "../src/infra/database/schema";
import { SONNET_HIGH, THREE, draft, rejection, seedStoredPlan, seedTaskSet, storedItems } from "./plan-support";
import { closeTaskFixture } from "./task-api-support";
import { taskSetWorld } from "./task-set-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.plan.save", () => {
  it("V-36d refuses a save with an old version, keeps the first save and logs the conflict", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const world = await taskSetWorld();
    await seedTaskSet(world, THREE);
    await seedStoredPlan(world, { version: 1, items: [{ taskIds: ["task_01"] }] });
    const { caller } = world.harness;
    expect(await caller.plan.save({ ...world.scope, version: 1, items: [draft(["task_01"]), draft(["task_02", "task_03"])] })).toEqual({ version: 2 });
    const stale = await rejection(caller.plan.save({ ...world.scope, version: 1, items: [draft(["task_01", "task_02", "task_03"])] }));
    expect(stale).toEqual({ code: "CONFLICT", message: "O plano mudou em outra aba. Recarregue para continuar.", reason: "plan_conflict" });
    expect(await storedItems(world)).toEqual([[1, ["task_01"], "opus", "max"], [2, ["task_02", "task_03"], "opus", "max"]]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[plan] conflict"));
  });

  it("V-36e creates the plan on version 0 and saves one session per task with the third on Sonnet and High", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const world = await taskSetWorld();
    await seedTaskSet(world, THREE);
    const { caller } = world.harness;
    expect(await caller.plan.save({ ...world.scope, version: 0, items: [draft(["task_01", "task_02", "task_03"])] })).toEqual({ version: 1 });
    const saved = await caller.plan.save({ ...world.scope, version: 1, items: [draft(["task_01"]), draft(["task_02"]), draft(["task_03"], { choice: SONNET_HIGH })] });
    expect(saved).toEqual({ version: 2 });
    const view = await caller.plan.get(world.scope);
    expect(view).toMatchObject({ version: 2, stale: false, unassigned: [] });
    expect(view.items.map((item) => [item.position, item.taskIds, item.choice.model, item.choice.effort])).toEqual([[1, ["task_01"], "opus", "max"], [2, ["task_02"], "opus", "max"], [3, ["task_03"], "sonnet", "high"]]);
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/^\[plan\] saved .*version=2 sessions=3 tasks=3/));
  });

  it("V-36e keeps the id of an item that is edited and renumbers positions without colliding", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, { ids: ["task_01", "task_02", "task_03"] });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }, { taskIds: ["task_02"] }, { taskIds: ["task_03"] }] });
    await world.harness.caller.plan.save({ ...world.scope, version: 1, items: [draft(["task_03"], { id: items[2]!.id }), draft(["task_01"], { id: items[0]!.id }), draft(["task_02"], { id: items[1]!.id, choice: SONNET_HIGH })] });
    const rows = await world.setup.database.select().from(taskSessionPlanItems);
    expect(rows.map((row) => [row.id, row.position, row.model]).sort()).toEqual([[items[0]!.id, 2, "opus"], [items[1]!.id, 3, "sonnet"], [items[2]!.id, 1, "opus"]].sort());
  });
});
