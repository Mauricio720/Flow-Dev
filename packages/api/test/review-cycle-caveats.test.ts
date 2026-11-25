import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { caveatsPrompt, reviewContinuation } from "../src/application/services/review/reviewPrompts";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { cycleAtCurrentTime, tickUntil } from "./review-cycle-sessions-support";
import { continuationsOf, cycleRow, sessionsOf, userMessagesOf } from "./review-cycle-rounds-support";
import { CAVEATS_ONCE, caveatsRoundTwoWorld, REPORT_004, REPORT_005, requestAction } from "./review-cycle-caveats-support";
import { FOLDER } from "./plan-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("ReviewCycleStep caveats", () => {
  it("V-05c accepts second-round caveats and ends both sessions without another message", async () => {
    const world = await caveatsRoundTwoWorld();
    const before = await cycleRow(world);
    const [review] = await sessionsOf(world);
    const messagesBefore = (await userMessagesOf(world, review!.id)).length;
    await requestAction(world, "accept");
    const accepted = await tickUntil(world, (current) => current.state === "accepted");
    expect(accepted).toMatchObject({ round: 2, endedBy: world.setup.ownerId, pendingAction: null, reviewSessionId: before.reviewSessionId });
    expect(accepted.endedAt).toEqual(world.worker.clock.now());
    expect(await userMessagesOf(world, review!.id)).toHaveLength(messagesBefore);
    await cycleAtCurrentTime(world.worker);
    expect((await sessionsOf(world)).map((session) => session.status)).toEqual(["ended", "ended"]);
  });

  it("V-05d sends caveats to the same executor and continues the same reviewer in round three", async () => {
    const world = await caveatsRoundTwoWorld();
    const [review, execute] = await sessionsOf(world);
    await requestAction(world, "fix");
    const fixing = await tickUntil(world, (current) => current.state === "executing");
    expect(fixing).toMatchObject({ stepRole: "execute", round: 2, executeSessionId: execute!.id });
    expect(await continuationsOf(world, execute!.id, caveatsPrompt({ folder: FOLDER, reportPath: REPORT_005 }))).toHaveLength(1);
    const roundThree = await tickUntil(world, (current) => current.state === "reviewing" && current.round === 3);
    expect(roundThree.reviewSessionId).toBe(review!.id);
    expect(await continuationsOf(world, review!.id, reviewContinuation({ folder: FOLDER, partial: false }))).toHaveLength(2);
  });

  it("V-05d opens a missing executor with the caveats prompt on a first-round fix", async () => {
    const world = await reviewCycleWorkerWorld(CAVEATS_ONCE);
    await tickUntil(world, (current) => current.state === "caveats");
    await requestAction(world, "fix");
    const fixing = await tickUntil(world, (current) => current.state === "executing");
    const [executor] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, fixing.executeSessionId!));
    expect(await world.harness.context.readPrompt(executor!.id)).toBe(caveatsPrompt({ folder: FOLDER, reportPath: REPORT_004 }));
    expect(executor).toMatchObject({ purpose: "review_execute", reviewCycleId: world.reviewCycle.id });
    expect((await cycleRow(world)).reviewSessionId).not.toBeNull();
  });
});
