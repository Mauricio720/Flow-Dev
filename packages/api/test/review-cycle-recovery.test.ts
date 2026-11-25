import { afterEach, describe, expect, it } from "vitest";
import { executeInitialPrompt } from "../src/application/services/review/reviewPrompts";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { cycleSessions } from "./review-cycle-restart-support";
import { faultyWorker, tickBuilt } from "./review-cycle-recovery-support";
import { request, REPORT_004, REVIEW_EXECUTE, row, WAIT } from "./review-cycle-sessions-support";
import { FOLDER } from "./plan-support";

const MAX_TICKS = 24;

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

async function tickUntilBuilt(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>, built: ReturnType<typeof faultyWorker>, reached: () => Promise<boolean>) {
  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    await tickBuilt(world, built);
    if (await reached()) return;
  }
  throw new Error("O ciclo não chegou ao estado esperado.");
}

describe("ReviewCycleStep session recovery", () => {
  it("REQ-020 registers a launched executor that lost its setSession, without opening a second one", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_EXECUTE, WAIT);
    const built = faultyWorker(world, { role: "execute", mode: "throw" });
    await tickUntilBuilt(world, built, async () => (await cycleSessions(world)).length === 2);
    expect(await row(world)).toMatchObject({ state: "executing", executeSessionId: null });
    await tickUntilBuilt(world, built, async () => (await row(world)).executeSessionId !== null);
    const executor = (await cycleSessions(world)).find((session) => session.purpose === "review_execute")!;
    expect(await row(world)).toMatchObject({ state: "executing", executeSessionId: executor.id, failure: null });
    expect(await cycleSessions(world)).toHaveLength(2);
    expect(await world.harness.context.readPrompt(executor.id)).toBe(executeInitialPrompt({ folder: FOLDER, reportPath: REPORT_004 }));
  });

  it("REQ-040 ends a session launched while the operator stopped the cycle", async () => {
    const world = await reviewCycleWorkerWorld(WAIT, WAIT);
    const built = faultyWorker(world, { role: "review", mode: "lose" });
    await tickUntilBuilt(world, built, async () => (await cycleSessions(world)).length === 1);
    expect((await row(world)).reviewSessionId).toBeNull();
    await request(world, "stop");
    await tickUntilBuilt(world, built, async () => (await cycleSessions(world)).every((session) => session.status === "ended"));
    expect(await row(world)).toMatchObject({ state: "stopped" });
    expect((await cycleSessions(world)).map((session) => session.status)).toEqual(["ended"]);
  });
});
