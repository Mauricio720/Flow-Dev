import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskReviewCycles, taskReviewRounds } from "../src/infra/database/schema";
import { cycle } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { advance, request, row, WAIT } from "./review-cycle-sessions-support";

const REPORT_PATH = "docs/specs/x/reviews/review-004.md";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

type World = Awaited<ReturnType<typeof reviewCycleWorkerWorld>>;

async function readCycle(world: World) {
  const view = await world.service.get({ taskId: world.setup.taskId });
  return view.cycle;
}

async function finishWith(world: World, state: "approved" | "accepted") {
  await world.setup.database.update(taskReviewCycles).set({ state }).where(eq(taskReviewCycles.id, world.reviewCycle.id));
  return readCycle(world);
}

describe("tasks.review get after the cycle ends", () => {
  it("keeps returning the stopped cycle with its round and end time", async () => {
    const world = await reviewCycleWorkerWorld(WAIT, WAIT);
    await cycle(world.worker);
    await request(world, "stop");
    await advance(world.worker);
    expect(await readCycle(world)).toMatchObject({ id: world.reviewCycle.id, state: "stopped", round: 1, stopReason: null, endedAt: expect.any(String) });
    expect(await row(world)).toMatchObject({ state: "stopped" });
  });

  it("returns the approved and accepted cycles with the rounds and the report artifact", async () => {
    const world = await reviewCycleWorkerWorld(WAIT, WAIT);
    await world.setup.database.insert(taskReviewRounds).values({ cycleId: world.reviewCycle.id, number: 1, verdict: "approved", reportPath: REPORT_PATH });
    expect(await finishWith(world, "approved")).toMatchObject({ state: "approved", rounds: [{ number: 1, verdict: "approved", reportPath: REPORT_PATH }] });
    expect(await finishWith(world, "accepted")).toMatchObject({ state: "accepted", rounds: [{ number: 1 }] });
  });

  it("prefers the newest cycle once a new one starts after the final one", async () => {
    const world = await reviewCycleWorkerWorld(WAIT, WAIT);
    await finishWith(world, "approved");
    const next = await world.service.start({ taskId: world.setup.taskId, projectId: world.setup.project.id, actorId: world.setup.ownerId, requestKey: crypto.randomUUID(), reviewer: world.reviewCycle.reviewer, executor: world.reviewCycle.executor, partial: false, allowOpenSessions: true });
    expect(next.id).not.toBe(world.reviewCycle.id);
    expect(await readCycle(world)).toMatchObject({ id: next.id, state: "reviewing" });
  });
});
