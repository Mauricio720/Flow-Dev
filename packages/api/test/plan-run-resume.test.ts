import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { PlanRunGuards } from "../src/application/services/plan-run/planRunGuards";
import { PlanRunPauser } from "../src/application/services/plan-run/planRunPauser";
import { PlanRunStep } from "../src/application/services/plan-run/planRunStep";
import { PlanRunStepStart } from "../src/application/services/plan-run/planRunStepStart";
import { TaskSetLoader } from "../src/application/services/tasks-set/taskSetLoader";
import { DrizzleTaskSetReadDao } from "../src/infra/database/dao/artifacts/drizzleTaskSetReadDao";
import { DrizzleIssueClaimDao } from "../src/infra/database/dao/assigned-issues/drizzleIssueClaimDao";
import { DrizzleExecutionPlanDao } from "../src/infra/database/dao/plans/drizzleExecutionPlanDao";
import { DrizzlePlanRunDao } from "../src/infra/database/dao/plans/drizzlePlanRunDao";
import { DrizzlePlanRunWorkerDao } from "../src/infra/database/dao/plans/drizzlePlanRunWorkerDao";
import { DrizzleTerminalSessionDao } from "../src/infra/database/dao/terminal/drizzleTerminalSessionDao";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { draft } from "./plan-support";
import { silentLog } from "./plan-run-support";
import { HOLD, leaveOpen, planRunWorkerWorld, planSessions, runRow, tickUntil, type PlanRunWorkerWorld } from "./plan-run-step-support";
import { cycle } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const change = (world: PlanRunWorkerWorld, revision: number) => ({ taskId: world.setup.taskId, actorId: world.setup.ownerId, revision });

async function failOpening(world: PlanRunWorkerWorld, sessionId: string) {
  await world.setup.database.update(taskTerminalSessions).set({ status: "launch_failed", launchError: "o Claude Code não respondeu", launchFailedAt: new Date(), startedAt: null }).where(eq(taskTerminalSessions.id, sessionId));
}

function staleStep(world: PlanRunWorkerWorld, stale: Awaited<ReturnType<DrizzlePlanRunDao["findByPlan"]>>, launch: ReturnType<typeof vi.fn>) {
  const { database } = world.setup;
  const runs = new DrizzlePlanRunDao(database);
  const pauser = new PlanRunPauser({ runs, log: silentLog });
  const guards = new PlanRunGuards({ claims: new DrizzleIssueClaimDao(database), planning: new DrizzleTerminalSessionDao(database), plans: new DrizzleExecutionPlanDao(database), loader: new TaskSetLoader(new DrizzleTaskSetReadDao(database)), pauser });
  const worker = new DrizzlePlanRunWorkerDao(database);
  const starter = new PlanRunStepStart({ runs, launcher: { launch }, pauser, log: silentLog });
  return new PlanRunStep({ worker: { ...worker, agentWorking: (taskId) => worker.agentWorking(taskId), currentSession: (id) => worker.currentSession(id), listRunningForHost: async () => [stale!] }, runs, guards, starter, pauser, captureStop: async () => undefined, hostId: machineIdentity(), log: silentLog });
}

describe("PlanRunStep pause and resume", () => {
  it("V-06m does not open a session when Pause wins the revision, and keeps a session that was already opening", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const world = await planRunWorkerWorld(() => HOLD, [{ taskIds: ["task_01"] }, { taskIds: ["task_03"] }]);
    const started = await world.start();
    const stale = await new DrizzlePlanRunDao(world.setup.database).findByPlan(world.plan.plan.id);
    await world.service.pause(change(world, started.revision));
    const launch = vi.fn();
    await staleStep(world, stale, launch).run();
    expect(launch).not.toHaveBeenCalled();
    expect(await runRow(world)).toMatchObject({ state: "paused", currentItemId: null });
    const other = await planRunWorkerWorld(() => HOLD, [{ taskIds: ["task_01"] }, { taskIds: ["task_03"] }]);
    await other.start();
    await other.worker.supervisor.tick();
    await other.service.pause(change(other, (await runRow(other)).revision));
    await cycle(other);
    await cycle(other);
    const sessions = await planSessions(other);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.status).not.toBe("ended");
  });

  it("V-06n resumes a session that only failed to open, skips one that ended with open tasks, and follows the order when the paused one was removed", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    let script = HOLD;
    const world = await planRunWorkerWorld(() => script, [{ taskIds: ["task_01"] }, { taskIds: ["task_02"] }, { taskIds: ["task_03"] }]);
    await world.start();
    await cycle(world);
    await failOpening(world, (await planSessions(world))[0]!.id);
    await cycle(world);
    const failed = await runRow(world);
    expect(failed).toMatchObject({ state: "paused", pauseReason: "A Sessão 1 falhou ao abrir: o Claude Code não respondeu." });
    script = leaveOpen("01");
    await world.service.resume(change(world, failed.revision));
    expect(await tickUntil(world, async () => (await runRow(world)).state === "paused")).toBe(true);
    const ended = await runRow(world);
    expect((await planSessions(world)).map((session) => session.planItemId)).toEqual([world.plan.items[0]!.id, world.plan.items[0]!.id]);
    expect(ended).toMatchObject({ state: "paused", pauseReason: "A Sessão 1 terminou com tarefas não concluídas: 01." });
    script = HOLD;
    await world.service.resume(change(world, ended.revision));
    await cycle(world);
    expect((await planSessions(world)).map((session) => session.planItemId).at(-1)).toBe(world.plan.items[2]!.id);
  });

  it("B-09 follows the order after the operator removed the session that caused the pause", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const world = await planRunWorkerWorld(() => HOLD, [{ taskIds: ["task_01"] }, { taskIds: ["task_03"] }]);
    await world.start();
    await cycle(world);
    await failOpening(world, (await planSessions(world))[0]!.id);
    await cycle(world);
    const paused = await runRow(world);
    const [, second] = world.plan.items;
    await world.harness.caller.plan.save({ ...world.scope, version: 1, items: [draft(["task_03"], { id: second!.id })] });
    await world.service.resume(change(world, paused.revision));
    await cycle(world);
    expect((await planSessions(world)).at(-1)).toMatchObject({ planItemId: second!.id });
  });
});
