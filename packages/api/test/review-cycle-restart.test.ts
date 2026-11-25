import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { executeInitialPrompt } from "../src/application/services/review/reviewPrompts";
import { reviewOpenRequestKey } from "../src/application/services/review/reviewRequestKeys";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { DrizzleReviewCycleWorkerDao } from "../src/infra/database/dao/review/drizzleReviewCycleWorkerDao";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { cycleSessions, executingCycleWorld } from "./review-cycle-restart-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { FOLDER } from "./plan-support";
import { row, WAIT } from "./review-cycle-sessions-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const INTERRUPTION = "A sessão foi interrompida ou encerrada antes de terminar a etapa.";
const REPORT_004 = `${FOLDER}/reviews/review-004.md`;

describe("ReviewCycleStep restart recovery", () => {
  it("V-06j fails the active execution after restart and retry resumes the same session history", async () => {
    const { world, cycle: executing } = await executingCycleWorld();
    const executeId = executing.executeSessionId!;
    const [oldSession] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, executeId));
    const runtime = new ScriptedSessionRuntime({ resumeScript: WAIT });
    const restarted = world.worker.build({ workerId: "worker-2", runtimes: { claude: runtime } });
    await restarted.supervisor.tick();
    await restarted.idle();
    expect(await row(world)).toMatchObject({ state: "failed", stepRole: "execute", failure: INTERRUPTION });
    const failed = await row(world);
    await world.service.request({ taskId: failed.taskId, cycleId: failed.id, revision: failed.revision, action: "retry", by: world.setup.ownerId, at: new Date() });
    await restarted.supervisor.tick();
    await restarted.supervisor.tick();
    await restarted.idle();
    await Promise.all([...runtime.runners.values()].map((runner) => runner.settled()));
    expect(runtime.resumes).toMatchObject([{ sessionId: executeId, claudeSessionId: oldSession!.claudeSessionId, firstMessage: executeInitialPrompt({ folder: FOLDER, reportPath: REPORT_004 }) }]);
    expect(await cycleSessions(world)).toHaveLength(2);
    expect(await row(world)).toMatchObject({ state: "executing", executeSessionId: executeId, failure: null });
  });

  it("V-06k reuses the launched request key after registration fails between launch and setSession", async () => {
    const runtime = new ScriptedSessionRuntime({ script: WAIT });
    const world = await reviewCycleWorkerWorld(WAIT, WAIT, { runtimes: { claude: runtime } });
    const base = new DrizzleReviewCycleWorkerDao(world.setup.database);
    const injected = new Proxy(base, { get(target, key) { if (key === "setSession") return async () => { throw new Error("falha simulada após launch"); }; const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value; } });
    const crashed = world.worker.build({ reviewCycles: injected });
    await crashed.supervisor.tick();
    const [launched] = await cycleSessions(world);
    expect(launched).toMatchObject({ purpose: "review", reviewCycleId: world.reviewCycle.id, requestKey: reviewOpenRequestKey({ cycleId: world.reviewCycle.id, role: "review", attempt: 1 }) });
    expect((await row(world)).reviewSessionId).toBeNull();
    const restartedRuntime = new ScriptedSessionRuntime({ script: WAIT });
    const restarted = world.worker.build({ workerId: "worker-2", runtimes: { claude: restartedRuntime } });
    await restarted.supervisor.tick();
    await restarted.idle();
    expect((await row(world)).reviewSessionId).toBe(launched!.id);
    expect(await cycleSessions(world)).toHaveLength(1);
  });
});
