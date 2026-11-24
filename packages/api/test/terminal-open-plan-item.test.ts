import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { blockedItem, itemRow, sessionsOf, startItem } from "./plan-open-support";
import { SONNET_HIGH, rejection, seedItemSession, seedStoredPlan, seedTaskSet, setTaskStatus } from "./plan-support";
import { cycle, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { HARNESS_NOW } from "./terminal-harness";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.terminal.open for a plan session", () => {
  it("V-37k refuses a blocked item without force, creating no session", async () => {
    const world = await workerWorld();
    const item = await blockedItem(world);
    expect(await rejection(startItem(world, { kind: "plan_item", planItemId: item.id }))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "plan_item_blocked" });
    expect(await sessionsOf(world)).toEqual([]);
  });

  it("V-37l starts a blocked item with force, recording who and when, and logs it", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const world = await workerWorld();
    const item = await blockedItem(world);
    const { sessionId } = await startItem(world, { kind: "plan_item", planItemId: item.id, force: true });
    expect(await itemRow(world, item.id)).toMatchObject({ forcedBy: world.setup.ownerId, forcedAt: HARNESS_NOW });
    expect(info).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[plan\\] item_started item=${item.id} session=${sessionId} agent=claude model=opus effort=max force=true`)));
  });

  it("V-37m refuses an item that is running and an item whose tasks are all completed", async () => {
    const world = await workerWorld();
    await seedTaskSet(world, { ids: ["task_01", "task_02"] });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }, { taskIds: ["task_02"] }] });
    await seedItemSession(world, { itemId: items[0]!.id, status: "running" });
    await setTaskStatus(world, "task_02", "completed");
    for (const item of items) expect(await rejection(startItem(world, { kind: "plan_item", planItemId: item.id }))).toMatchObject({ code: "CONFLICT", reason: "plan_item_not_ready" });
    expect(await sessionsOf(world)).toHaveLength(1);
  });

  it("V-37n opens with the choice of the item, links the session to it, and the runtime receives that choice", async () => {
    const world = await workerWorld();
    await seedTaskSet(world, { ids: ["task_01"] });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"], choice: SONNET_HIGH }] });
    const { sessionId } = await startItem(world, { kind: "plan_item", planItemId: items[0]!.id });
    await cycle(world);
    const [row] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId));
    expect(row).toMatchObject({ purpose: "plan_item", planItemId: items[0]!.id, agent: "claude", model: "sonnet", effort: "high" });
    expect(world.runtime.starts[0]).toMatchObject({ sessionId, model: "sonnet", effort: "high" });
  });

  it("V-37n rejects a choice sent inside the purpose of a plan session", async () => {
    const world = await workerWorld();
    await seedTaskSet(world, { ids: ["task_01"] });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }] });
    const outcome = await rejection(startItem(world, { kind: "plan_item", planItemId: items[0]!.id, choice: { agent: "claude", model: "haiku", effort: "low" } }));
    expect(outcome).toMatchObject({ code: "BAD_REQUEST" });
    expect(await sessionsOf(world)).toEqual([]);
  });
});
