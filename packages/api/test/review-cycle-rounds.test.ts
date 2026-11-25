import { afterEach, describe, expect, it } from "vitest";
import { executeInitialPrompt, reviewContinuation } from "../src/application/services/review/reviewPrompts";
import { cycle } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { cycleAtCurrentTime, tickUntil } from "./review-cycle-sessions-support";
import { FOLDER } from "./plan-support";
import { APPROVED_ONCE, continuationsOf, cycleRow, EXECUTION, expectApprovedAndClosed, expectReviewLogs, expectRoundTwoMessage, REPORT_004, REVIEW_THEN_ASK, REVIEW_TWICE, sessionsOf } from "./review-cycle-rounds-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("ReviewCycleStep rounds", () => {
  it("V-05a drives rejected, execution, and approved rounds through the same two sessions", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_TWICE, EXECUTION);
    const executing = await tickUntil(world, (current) => current.state === "executing");
    const sessions = await sessionsOf(world);
    const execution = sessions.find((session) => session.purpose === "review_execute")!;
    expect(executing).toMatchObject({ round: 1, executeSessionId: execution.id });
    expect(sessions).toHaveLength(2);
    expect(await world.harness.context.readPrompt(execution.id)).toBe(executeInitialPrompt({ folder: FOLDER, reportPath: REPORT_004 }));
    const approved = await tickUntil(world, (current) => current.state === "approved");
    const closedAt = world.worker.clock.now();
    expect(approved.endedAt).toEqual(closedAt);
    await expectRoundTwoMessage(world, sessions);
    await cycleAtCurrentTime(world.worker);
    await expectApprovedAndClosed(world, sessions, closedAt);
    expectReviewLogs(world, sessions);
  });

  it("V-05b finishes an approved first review without opening execution", async () => {
    const world = await reviewCycleWorkerWorld(APPROVED_ONCE);
    await tickUntil(world, (current) => current.state === "approved");
    expect(await cycleRow(world)).toMatchObject({ round: 1, executeSessionId: null });
    expect((await sessionsOf(world)).map((session) => session.purpose)).toEqual(["review"]);
  });

  it("V-05e sends one review continuation for the round even across repeated ticks", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_THEN_ASK, EXECUTION);
    await tickUntil(world, (current) => current.state === "reviewing" && current.round === 2);
    const reviewId = (await sessionsOf(world)).find((session) => session.purpose === "review")!.id;
    const content = reviewContinuation({ folder: FOLDER, partial: false });
    expect(await continuationsOf(world, reviewId, content)).toHaveLength(1);
    await cycle(world.worker);
    await cycle(world.worker);
    expect(await continuationsOf(world, reviewId, content)).toHaveLength(1);
  });
});
