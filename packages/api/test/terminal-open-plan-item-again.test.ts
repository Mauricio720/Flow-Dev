import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskSessionPlanItems } from "../src/infra/database/schema";
import { EDGES, blockedItem, itemRow, sessionsOf, startItem } from "./plan-open-support";
import { draft, rejection, seedItemSession, seedStoredPlan, seedTaskSet, setTaskStatus } from "./plan-support";
import { workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.terminal.open for a plan session again", () => {
  it("does not record a forced start when the item was ready, even with force, and clears an old mark", async () => {
    const world = await workerWorld();
    await seedTaskSet(world, { ids: ["task_01", "task_02"], edges: EDGES });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }] });
    await world.setup.database.update(taskSessionPlanItems).set({ forcedBy: world.setup.ownerId, forcedAt: new Date("2026-11-22T10:00:00Z") }).where(eq(taskSessionPlanItems.id, items[0]!.id));
    await startItem(world, { kind: "plan_item", planItemId: items[0]!.id, force: true });
    expect(await itemRow(world, items[0]!.id)).toMatchObject({ forcedBy: null, forcedAt: null });
  });

  it("starts an ended item again with the same choice, and requires force while a dependency is open", async () => {
    const world = await workerWorld();
    const item = await blockedItem(world);
    await seedItemSession(world, { itemId: item.id, status: "ended" });
    expect(await rejection(startItem(world, { kind: "plan_item", planItemId: item.id }))).toMatchObject({ reason: "plan_item_blocked" });
    await setTaskStatus(world, "task_01", "completed");
    const { sessionId } = await startItem(world, { kind: "plan_item", planItemId: item.id });
    expect((await sessionsOf(world)).find((row) => row.id === sessionId)).toMatchObject({ planItemId: item.id, model: "opus" });
  });

  it("V-44g refuses an item saved with the Codex while only the Claude is registered, and lets the plan swap the agent", async () => {
    const world = await workerWorld();
    await seedTaskSet(world, { ids: ["task_01"] });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"], choice: { agent: "codex", model: "gpt-6.1-sol", effort: "high" } }] });
    expect(await rejection(startItem(world, { kind: "plan_item", planItemId: items[0]!.id }))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "agent_unavailable" });
    expect(await sessionsOf(world)).toEqual([]);
    const view = await world.harness.caller.plan.get({ projectId: world.setup.project.id, taskId: world.setup.taskId });
    expect(view.items[0]).toMatchObject({ started: false, choice: { agent: "codex" } });
    await world.harness.caller.plan.save({ projectId: world.setup.project.id, taskId: world.setup.taskId, version: view.version, items: [draft(["task_01"], { id: items[0]!.id })] });
    expect((await itemRow(world, items[0]!.id))).toMatchObject({ agent: "claude", model: "opus", effort: "max" });
  });
});
