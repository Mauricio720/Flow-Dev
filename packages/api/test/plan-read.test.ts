import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskSessionPlanItems, taskSessionPlans } from "../src/infra/database/schema";
import { OPUS_MAX, addManifestVersion, seedItemSession, seedStoredPlan, seedTaskSet } from "./plan-support";
import { closeTaskFixture } from "./task-api-support";
import { taskSetWorld } from "./task-set-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const EDGES: Array<[string, string]> = [["task_01", "task_02"]];

describe("tasks.plan.get", () => {
  it("V-36a returns the saved sessions in order with state, blockers and the latest session, readable by a member without edit", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, { ids: ["task_01", "task_02", "task_03"], edges: EDGES });
    const { items } = await seedStoredPlan(world, { version: 3, items: [{ taskIds: ["task_01"] }, { taskIds: ["task_02", "task_03"] }] });
    const session = await seedItemSession(world, { itemId: items[0]!.id, status: "running" });
    const view = await world.harness.caller.plan.get(world.scope);
    expect(view).toMatchObject({ version: 3, stale: false, unassigned: [], canEdit: true });
    expect(view.items).toEqual([
      { id: items[0]!.id, position: 1, taskIds: ["task_01"], choice: OPUS_MAX, state: "running", started: true, after: [], waitingSessions: [], blockedBy: [], forced: null, latestSessionId: session.id },
      { id: items[1]!.id, position: 2, taskIds: ["task_02", "task_03"], choice: OPUS_MAX, state: "blocked", started: false, after: [], waitingSessions: [], blockedBy: [{ taskId: "task_01", status: "pending" }], forced: null, latestSessionId: null },
    ]);
    await world.setup.authorize(world.setup.readerId);
    const asMember = await world.harness.callerFor(world.setup.readerId).plan.get(world.scope);
    expect(asMember).toMatchObject({ canEdit: false, version: 3 });
    expect(asMember.items).toHaveLength(2);
  });

  it("lists the agents with their availability, so the screen can disable the ones that cannot run here", async () => {
    const world = await taskSetWorld();
    const { agents } = await world.harness.caller.plan.get(world.scope);
    expect(agents).toEqual([
      { agent: "claude", available: true, reason: null, models: ["opus", "sonnet", "haiku"], efforts: ["low", "medium", "high", "xhigh", "max"] },
      { agent: "codex", available: false, reason: "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo.", models: [], efforts: [], modelOptions: [] },
    ]);
  });

  it("V-36b returns version 0, no sessions and every task unassigned when there is no plan", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, { ids: ["task_01", "task_02", "task_03"] });
    expect(await world.harness.caller.plan.get(world.scope)).toMatchObject({ version: 0, stale: false, unassigned: ["task_01", "task_02", "task_03"], canEdit: true, items: [] });
  });

  it("returns an empty plan without a task set, and shows the forced start only after the session started", async () => {
    const world = await taskSetWorld();
    expect(await world.harness.caller.plan.get(world.scope)).toMatchObject({ version: 0, stale: false, unassigned: [], canEdit: true, items: [] });
    await seedTaskSet(world, { ids: ["task_01"] });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }] });
    await world.setup.database.update(taskSessionPlanItems).set({ forcedBy: world.setup.ownerId, forcedAt: new Date("2026-11-23T15:10:00Z") }).where(eq(taskSessionPlanItems.id, items[0]!.id));
    expect((await world.harness.caller.plan.get(world.scope)).items[0]!.forced).toBeNull();
    await seedItemSession(world, { itemId: items[0]!.id, status: "ended" });
    expect((await world.harness.caller.plan.get(world.scope)).items[0]!.forced).toEqual({ by: expect.any(String), at: "2026-11-23T15:10:00.000Z" });
  });

  it("reconciles at read time without writing: a removed task leaves the session and the plan becomes stale", async () => {
    const world = await taskSetWorld();
    const manifest = await seedTaskSet(world, { ids: ["task_01", "task_02", "task_03"] });
    await seedStoredPlan(world, { manifestVersion: 1, items: [{ taskIds: ["task_01"] }, { taskIds: ["task_02", "task_03"] }] });
    await addManifestVersion(world, { artifactId: manifest.id, version: 2, ids: ["task_01", "task_02"] });
    const view = await world.harness.caller.plan.get(world.scope);
    expect(view).toMatchObject({ stale: true, unassigned: [] });
    expect(view.items.map((item) => item.taskIds)).toEqual([["task_01"], ["task_02"]]);
    const stored = await world.setup.database.select().from(taskSessionPlanItems);
    expect(stored.map((item) => item.taskIds).sort()).toEqual([["task_01"], ["task_02", "task_03"]]);
    expect((await world.setup.database.select().from(taskSessionPlans))[0]!.version).toBe(1);
  });

  it("keeps the plan fresh when a new manifest version only changed the text", async () => {
    const world = await taskSetWorld();
    const manifest = await seedTaskSet(world, { ids: ["task_01", "task_02"] });
    await seedStoredPlan(world, { manifestVersion: 1, items: [{ taskIds: ["task_01", "task_02"] }] });
    await addManifestVersion(world, { artifactId: manifest.id, version: 2, ids: ["task_01", "task_02"], note: "\nTabela de estado atualizada\n" });
    const view = await world.harness.caller.plan.get(world.scope);
    expect(view).toMatchObject({ stale: false, unassigned: [] });
    expect(view.items).toHaveLength(1);
  });
});
