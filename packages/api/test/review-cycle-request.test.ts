import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskReviewCycles } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { REVIEWER, EXECUTOR, reviewCycleWorld, reviewInput, seedReviewTasks } from "./review-cycle-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.review request", () => {
  it("V-04g lets a member read but requires the operator for start and request", async () => {
    const world = await reviewCycleWorld();
    await world.setup.authorize(world.setup.readerId);
    const member = world.reviewCallerFor(world.setup.readerId).review;
    const { actorId, ...startInput } = reviewInput(world);
    expect(actorId).toBe(world.setup.ownerId);
    expect(await member.get({ projectId: world.setup.project.id, taskId: world.setup.taskId })).toMatchObject({ cycle: null });
    await expect(member.start(startInput)).rejects.toMatchObject({ code: "FORBIDDEN", cause: { reason: "operator_required" } });
    await expect(member.request({ projectId: world.setup.project.id, taskId: world.setup.taskId, cycleId: "30000000-0000-4000-8000-000000000003", revision: 1, action: "stop" })).rejects.toMatchObject({ code: "FORBIDDEN", cause: { reason: "operator_required" } });
    await expect(world.reviewCallerFor("30000000-0000-4000-8000-000000000099").review.get({ projectId: world.setup.project.id, taskId: world.setup.taskId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("V-04h records allowed requests, rejects invalid actions and preserves cycle choices", async () => {
    const world = await reviewCycleWorld();
    await seedReviewTasks(world);
    const cycle = await world.service.start(reviewInput(world, { reviewer: REVIEWER, executor: EXECUTOR }));
    await expect(world.service.request({ taskId: world.setup.taskId, cycleId: cycle.id, revision: cycle.revision, action: "accept", by: world.setup.ownerId, at: new Date("2026-11-25T12:00:00Z") })).rejects.toMatchObject({ reason: "review_action_invalid" });
    const updated = await world.service.request({ taskId: world.setup.taskId, cycleId: cycle.id, revision: cycle.revision, action: "stop", by: world.setup.ownerId, at: new Date("2026-11-25T12:00:00Z") });
    expect(updated).toMatchObject({ pendingAction: "stop", revision: 2, reviewer: REVIEWER, executor: EXECUTOR });
    const [stored] = await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, cycle.id));
    expect(stored).toMatchObject({ pendingAction: "stop", pendingBy: world.setup.ownerId, pendingAt: new Date("2026-11-25T12:00:00Z"), revision: 2 });
  });

  it("V-08b lets one concurrent caveat action through and reports a changed cycle to the other", async () => {
    const world = await reviewCycleWorld();
    await seedReviewTasks(world);
    const cycle = await world.service.start(reviewInput(world));
    await world.setup.database.update(taskReviewCycles).set({ state: "caveats" }).where(eq(taskReviewCycles.id, cycle.id));
    const request = world.reviewCallerFor(world.setup.ownerId).review.request;
    const base = { projectId: world.setup.project.id, taskId: world.setup.taskId, cycleId: cycle.id, revision: cycle.revision };
    const outcomes = await Promise.allSettled([request({ ...base, action: "accept" }), request({ ...base, action: "fix" })]);
    const accepted = outcomes.filter((outcome) => outcome.status === "fulfilled");
    const rejected = outcomes.filter((outcome) => outcome.status === "rejected");
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({ status: "rejected", reason: { code: "CONFLICT", message: "A revisão mudou. Veja o estado atual.", cause: { reason: "review_cycle_changed" } } });
    const [stored] = await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, cycle.id));
    expect(stored?.revision).toBe(2);
    expect(["accept", "fix"]).toContain(stored?.pendingAction);
  });
});
