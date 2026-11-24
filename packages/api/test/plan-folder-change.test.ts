import { afterEach, describe, expect, it, vi } from "vitest";
import { taskSessionPlanItems, taskSessionPlans, taskTerminalSessions } from "../src/infra/database/schema";
import { EDGES, sessionsOf, startItem } from "./plan-open-support";
import { OPUS_MAX, T11, draft, rejection, seedItemSession, seedStoredPlan, seedTaskSet } from "./plan-support";
import { cycle, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const OLD_FOLDER = "docs/specs/login";
const NEW_FOLDER = "docs/specs/other";
const IDS = ["task_01", "task_02"];

async function startedPlanThenNewerSet() {
  const world = await workerWorld();
  await seedTaskSet(world, { ids: IDS, edges: EDGES });
  const { items } = await seedStoredPlan(world, { items: [{ taskIds: IDS }] });
  const oldSession = await seedItemSession(world, { itemId: items[0]!.id, status: "ended" });
  await seedTaskSet(world, { ids: IDS, edges: EDGES, folder: NEW_FOLDER, at: T11 });
  const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
  return { world, scope, item: items[0]!, oldSession };
}

describe("a plan saved for another task folder", () => {
  it("shows an empty plan with the folder that changed, keeps every task unassigned and refuses to start the old item", async () => {
    const { world, scope, item } = await startedPlanThenNewerSet();
    const view = await world.harness.caller.plan.get(scope);
    expect(view).toMatchObject({ version: 1, stale: false, folderChange: { from: OLD_FOLDER, to: NEW_FOLDER }, items: [], unassigned: IDS });
    const outcome = await rejection(startItem(world, { kind: "plan_item", planItemId: item.id }));
    expect(outcome).toMatchObject({ code: "CONFLICT", reason: "plan_item_not_ready" });
    expect(await sessionsOf(world)).toHaveLength(1);
  });

  it("drops the old plan, started sessions included, on save, keeps their sessions in the history and plans the new folder", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { world, scope, item, oldSession } = await startedPlanThenNewerSet();
    const saved = await world.harness.caller.plan.save({ ...scope, version: 1, items: [draft(IDS, { id: item.id, choice: OPUS_MAX })] });
    expect(saved).toEqual({ version: 2 });
    const [plan] = await world.setup.database.select().from(taskSessionPlans);
    expect(plan).toMatchObject({ tasksFolder: NEW_FOLDER, version: 2 });
    const rows = await world.setup.database.select().from(taskSessionPlanItems);
    expect(rows.map((row) => [row.taskIds, row.id === item.id])).toEqual([[IDS, false]]);
    const sessions = await world.setup.database.select().from(taskTerminalSessions);
    expect(sessions.map((session) => [session.id, session.planItemId])).toEqual([[oldSession.id, null]]);
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/^\[plan\] saved .*version=2 sessions=1 tasks=2 reset=true/));
    expect(await world.harness.caller.plan.get(scope)).toMatchObject({ folderChange: null, stale: false, items: [{ taskIds: IDS, started: false }] });
  });

  it("starts the new plan item after the save", async () => {
    const { world, scope } = await startedPlanThenNewerSet();
    await world.harness.caller.plan.save({ ...scope, version: 1, items: [draft(IDS)] });
    const [row] = await world.setup.database.select().from(taskSessionPlanItems);
    const { sessionId } = await startItem(world, { kind: "plan_item", planItemId: row!.id });
    await cycle(world);
    expect(world.runtime.starts[0]).toMatchObject({ sessionId });
  });

  it("allows saving an empty plan to adopt the new folder", async () => {
    const { world, scope } = await startedPlanThenNewerSet();
    expect(await world.harness.caller.plan.save({ ...scope, version: 1, items: [] })).toEqual({ version: 2 });
    expect(await world.harness.caller.plan.get(scope)).toMatchObject({ folderChange: null, items: [], unassigned: IDS });
  });
});
