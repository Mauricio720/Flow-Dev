import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { DrizzleTerminalSessionDao } from "../src/infra/database/dao/terminal/drizzleTerminalSessionDao";
import { taskPlanningDecisions, taskTerminalSessions } from "../src/infra/database/schema";
import { seedStoredPlan, seedTaskSet } from "./plan-support";
import { taskSetWorld } from "./task-set-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders, openInput } from "./terminal-support";
import { readySetup } from "./terminal-open-support";
import { executionWorld, seedSession } from "./terminal-execution-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

function creation(world: Awaited<ReturnType<typeof taskSetWorld>>, decisionId: string, overrides: Record<string, unknown> = {}) {
  const { setup } = world;
  return { taskId: setup.taskId, projectId: setup.project.id, userId: setup.ownerId, planningDecisionId: decisionId, route: "tech_spec" as const, requestKey: crypto.randomUUID(), checkoutPath: "/work/shop", branch: null, dirty: false, runtime: "flow_dev" as const, permissionMode: "bypass" as const, hostId: "maquina", ...overrides };
}

describe("session purpose and choice", () => {
  it("V-37a opens a route session as route and claude, with no model and no effort (section 9)", async () => {
    const { setup, harness } = await readySetup();
    const { sessionId } = await harness.caller.terminal.open(openInput(setup));
    const [row] = await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId));
    expect(row).toMatchObject({ purpose: "route", agent: "claude", model: "opus", effort: "max", planItemId: null });
  });

  it("V-37a stores the purpose, the plan item, the agent, the model and the effort, and reads them back as the record", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, { ids: ["task_01"] });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"] }] });
    const [decision] = await world.setup.database.select().from(taskPlanningDecisions);
    const dao = new DrizzleTerminalSessionDao(world.setup.database);
    const { session, created } = await dao.create(creation(world, decision!.id, { purpose: "plan_item", planItemId: items[0]!.id, agent: "claude", model: "sonnet", effort: "high" }));
    expect(created).toBe(true);
    expect(session).toMatchObject({ purpose: "plan_item", planItemId: items[0]!.id, agent: "claude", model: "sonnet", effort: "high" });
    expect(await dao.findById(session.id)).toMatchObject({ purpose: "plan_item", planItemId: items[0]!.id, agent: "claude", model: "sonnet", effort: "high" });
  });

  it("V-37a replaces the choice when a session that failed to open is relaunched with the same request key", async () => {
    const world = await taskSetWorld();
    const [decision] = await world.setup.database.select().from(taskPlanningDecisions);
    const dao = new DrizzleTerminalSessionDao(world.setup.database);
    const first = await dao.create(creation(world, decision!.id, { requestKey: "00000000-0000-4000-8000-000000000001", model: "opus", effort: "max" }));
    await dao.markLaunchFailed(first.session.id, "falhou");
    const again = await dao.create(creation(world, decision!.id, { requestKey: "00000000-0000-4000-8000-000000000001", purpose: "generate_tasks", model: "haiku", effort: "low" }));
    expect(again.created).toBe(true);
    expect(again.session).toMatchObject({ id: first.session.id, purpose: "generate_tasks", model: "haiku", effort: "low", agent: "claude" });
  });

  it("V-37b shows the agent, the model and the effort of each session in the execution history", async () => {
    const world = await executionWorld();
    const route = await seedSession(world, { status: "ended", openedAt: new Date("2026-11-23T10:00:00Z") });
    const plan = await seedSession(world, { status: "running", purpose: "plan_item", model: "sonnet", effort: "high", openedAt: new Date("2026-11-23T11:00:00Z") });
    const { sessions } = await world.reader.read(world.setup.taskId, new Date("2026-11-23T11:01:00Z"));
    expect(sessions.map((session) => [session.id, session.purpose, session.agent, session.model, session.effort])).toEqual([[plan.id, "plan_item", "claude", "sonnet", "high"], [route.id, "route", "claude", null, null]]);
  });
});
