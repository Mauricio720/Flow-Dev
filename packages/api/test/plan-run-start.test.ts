import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { projectLocalCheckouts, taskSessionPlanRuns } from "../src/infra/database/schema";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { seedItemSession } from "./plan-support";
import { planRunWorld, runRows, seedTwoSessionPlan, startInput } from "./plan-run-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const OTHER_KEY = "40000000-0000-4000-8000-000000000002";

describe("PlanRunService.start", () => {
  it("V-04c creates a running run on this machine in the name of the operator", async () => {
    const world = await planRunWorld();
    await seedTwoSessionPlan(world);
    expect(await world.service.start(startInput(world))).toEqual({ state: "running", reason: null, pausedBy: null, currentItemId: null, revision: 1 });
    expect(await runRows(world)).toMatchObject([{ hostId: machineIdentity(), startedBy: world.setup.ownerId, state: "running", resumeCount: 0 }]);
  });

  it("V-04d refuses a plan with an empty session and a plan with every session started, saving no run", async () => {
    const world = await planRunWorld();
    const { items } = await seedTwoSessionPlan(world, [{ taskIds: ["task_01", "task_02"] }, { taskIds: [] }]);
    await expect(world.service.start(startInput(world))).rejects.toMatchObject({ reason: "plan_run_session_empty", fieldErrors: { message: "A Sessão 2 está sem tarefas. Adicione tarefas ou remova a sessão." } });
    await world.setup.database.execute(`delete from task_session_plan_items where id = '${items[1]!.id}'`);
    await seedItemSession(world, { itemId: items[0]!.id, status: "running" });
    await expect(world.service.start(startInput(world))).rejects.toMatchObject({ reason: "plan_run_nothing_to_start" });
    expect(await runRows(world)).toEqual([]);
  });

  it("V-04e refuses when the session service is stopped or the clone is missing, saving no run", async () => {
    const offline = await planRunWorld({ serviceRunning: false });
    await seedTwoSessionPlan(offline);
    await expect(offline.service.start(startInput(offline))).rejects.toMatchObject({ reason: "session_service_offline" });
    expect(await runRows(offline)).toEqual([]);
    const world = await planRunWorld();
    await seedTwoSessionPlan(world);
    await world.setup.database.delete(projectLocalCheckouts).where(eq(projectLocalCheckouts.projectId, world.setup.project.id));
    await expect(world.service.start(startInput(world))).rejects.toMatchObject({ reason: "checkout_missing" });
    expect(await runRows(world)).toEqual([]);
  });

  it("V-04f keeps a single run for two tabs: same key returns it, another key is refused", async () => {
    const world = await planRunWorld();
    await seedTwoSessionPlan(world);
    const first = await world.service.start(startInput(world));
    expect(await world.service.start(startInput(world))).toEqual(first);
    await expect(world.service.start(startInput(world, OTHER_KEY))).rejects.toMatchObject({ reason: "plan_run_active" });
    expect(await runRows(world)).toHaveLength(1);
  });

  it("V-04g reuses a completed run, pauses, ignores a repeated pause, resumes and refuses an old revision", async () => {
    const world = await planRunWorld();
    await seedTwoSessionPlan(world);
    await world.service.start(startInput(world));
    await world.setup.database.update(taskSessionPlanRuns).set({ state: "completed" });
    const restarted = await world.service.start(startInput(world, OTHER_KEY));
    expect(restarted).toMatchObject({ state: "running", revision: 2 });
    expect(await runRows(world)).toMatchObject([{ resumeCount: 1 }]);
    const change = { taskId: world.setup.taskId, actorId: world.setup.ownerId };
    const paused = await world.service.pause({ ...change, revision: 2 });
    expect(paused).toMatchObject({ state: "paused", revision: 3, reason: null });
    expect(paused.pausedBy).not.toBeNull();
    expect(await world.service.pause({ ...change, revision: 2 })).toEqual(paused);
    const resumed = await world.service.resume({ ...change, revision: 3 });
    expect(resumed).toMatchObject({ state: "running", revision: 4, pausedBy: null });
    expect(await runRows(world)).toMatchObject([{ resumeCount: 2, startedBy: world.setup.ownerId }]);
    await expect(world.service.pause({ ...change, revision: 3 })).rejects.toMatchObject({ reason: "plan_run_state" });
  });
});
