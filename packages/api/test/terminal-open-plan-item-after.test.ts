import { afterEach, describe, expect, it, vi } from "vitest";
import { taskSessionPlanItemDependencies } from "../src/infra/database/schema";
import { itemRow, sessionsOf, startItem } from "./plan-open-support";
import { rejection, seedStoredPlan, seedTaskSet } from "./plan-support";
import { workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

type World = Awaited<ReturnType<typeof workerWorld>>;

async function waitingOnFirstSession(world: World) {
  await seedTaskSet(world, { ids: ["task_01", "task_02", "task_03"] });
  const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }, { taskIds: ["task_02"] }, { taskIds: ["task_03"] }] });
  await world.setup.database.insert(taskSessionPlanItemDependencies).values({ itemId: items[2]!.id, afterItemId: items[0]!.id });
  return items[2]!;
}

describe("tasks.terminal.open for a session that starts after another", () => {
  it("V-02g refuses without force while the earlier session is not completed, and starts with force recording who forced", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const world = await workerWorld();
    const item = await waitingOnFirstSession(world);
    expect(await rejection(startItem(world, { kind: "plan_item", planItemId: item.id }))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "plan_item_blocked" });
    expect(await sessionsOf(world)).toEqual([]);
    await startItem(world, { kind: "plan_item", planItemId: item.id, force: true });
    expect(await itemRow(world, item.id)).toMatchObject({ forcedBy: world.setup.ownerId });
    expect(await sessionsOf(world)).toHaveLength(1);
  });

  it("V-02h refuses to start a session without tasks", async () => {
    const world = await workerWorld();
    await seedTaskSet(world, { ids: ["task_01"] });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: [] }, { taskIds: ["task_01"] }] });
    expect(await rejection(startItem(world, { kind: "plan_item", planItemId: items[0]!.id }))).toMatchObject({ code: "CONFLICT", reason: "plan_item_not_ready" });
    expect(await sessionsOf(world)).toEqual([]);
  });
});
