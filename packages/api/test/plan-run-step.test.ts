import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { projectLocalCheckouts } from "../src/infra/database/schema";
import { draft } from "./plan-support";
import { HOLD, completeTask, planRunWorkerWorld, planSessions, runRow, tickUntil } from "./plan-run-step-support";
import { cycle } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const TWO_SESSIONS = [{ taskIds: ["task_01"] }, { taskIds: ["task_02"] }];
const CHECKOUT_MISSING = "Você ainda não vinculou o clone local deste projeto. Vincule a pasta nas Configurações para abrir a execução.";

describe("PlanRunStep", () => {
  it("V-06h opens the first ready session in a tick, records it as current and logs it", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const world = await planRunWorkerWorld(() => HOLD, TWO_SESSIONS);
    await world.start();
    await cycle(world);
    const [session] = await planSessions(world);
    const first = world.plan.items[0]!;
    expect(session).toMatchObject({ planItemId: first.id, userId: world.setup.ownerId, permissionMode: "bypass", agent: "claude", model: "opus", effort: "max", checkoutPath: world.clone });
    expect(await runRow(world)).toMatchObject({ state: "running", currentItemId: first.id, currentSessionId: session!.id });
    expect(await world.harness.context.readPrompt(session!.id)).toContain("docs/specs/login/task_01.md");
    expect(await world.harness.context.readPrompt(session!.id)).not.toContain("task_02.md");
    expect(info).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[plan\\] run_session_started .*item=${first.id} session=${session!.id} agent=claude model=opus`)));
  });

  it("V-06i starts the second session once the first completed its task, then completes the plan and opens nothing more", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const world = await planRunWorkerWorld((_context, index) => completeTask(index === 0 ? "01" : "02"), TWO_SESSIONS);
    await world.start();
    expect(await tickUntil(world, async () => (await runRow(world)).state === "completed")).toBe(true);
    const sessions = await planSessions(world);
    expect(sessions.map((session) => session.planItemId)).toEqual(world.plan.items.map((item) => item.id));
    for (let tick = 0; tick < 3; tick += 1) await cycle(world);
    expect(await planSessions(world)).toHaveLength(2);
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/^\[plan\] run_completed /));
  });

  it("V-06j pauses with the message of the Start button when the start is refused, without retrying", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const world = await planRunWorkerWorld(() => HOLD, TWO_SESSIONS);
    await world.start();
    await world.setup.database.delete(projectLocalCheckouts).where(eq(projectLocalCheckouts.projectId, world.setup.project.id));
    await cycle(world);
    expect(await runRow(world)).toMatchObject({ state: "paused", pauseReason: `Não foi possível iniciar a Sessão 1. ${CHECKOUT_MISSING}` });
    await cycle(world);
    expect(await planSessions(world)).toEqual([]);
  });

  it("V-06k opens a single session across repeated ticks and a restarted worker", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const world = await planRunWorkerWorld(() => HOLD, TWO_SESSIONS);
    await world.start();
    await world.worker.supervisor.tick();
    await world.worker.supervisor.tick();
    const restarted = world.build({ workerId: "worker-2" });
    await restarted.supervisor.tick();
    await cycle(world);
    expect(await planSessions(world)).toHaveLength(1);
  });

  it("V-06l uses the plan saved at the moment of each choice, and goes on when the manifest made the plan stale", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const world = await planRunWorkerWorld((_context, index) => completeTask(index === 0 ? "01" : "03"), [{ taskIds: ["task_01"] }, { taskIds: ["task_02"] }, { taskIds: ["task_03"] }]);
    await world.start();
    await cycle(world);
    const [first, second, third] = world.plan.items;
    await world.harness.caller.plan.save({ ...world.scope, version: 1, items: [draft(["task_01"], { id: first!.id }), draft(["task_02", "task_03"], { id: third!.id }), draft([], { id: second!.id })] });
    expect(await tickUntil(world, async () => (await planSessions(world)).length === 2)).toBe(true);
    expect((await planSessions(world))[1]).toMatchObject({ planItemId: third!.id });
  });
});
