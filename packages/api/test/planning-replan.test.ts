import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskIssueSnapshots, taskIssueSources } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { currentTask, planningBase, planningCaller, publishedTask, readPlanning, rejection, reviewState, seedReview, type PlanningSetup } from "./planning-support";

afterEach(async () => { vi.restoreAllMocks(); await closeTaskFixture(); });

async function approved(setup: PlanningSetup) {
  await seedReview(setup);
  const state = await reviewState(setup);
  await planningCaller(setup).planning.approve({ ...planningBase(setup, state.version), decisionId: state.decision.id, expectedDecisionVersion: state.decision.version, reviewedRoute: "tech_spec" });
}

async function changeSource(setup: PlanningSetup) {
  const [source] = await setup.database.select().from(taskIssueSources).where(eq(taskIssueSources.taskId, setup.taskId));
  const [current] = await setup.database.select().from(taskIssueSnapshots).where(eq(taskIssueSnapshots.id, source!.currentSnapshotId!));
  const { id: _id, ...rest } = current!;
  const [next] = await setup.database.insert(taskIssueSnapshots).values({ ...rest, revision: current!.revision + 1, publicationAttemptId: null }).returning();
  await setup.database.update(taskIssueSources).set({ currentSnapshotId: next!.id }).where(eq(taskIssueSources.id, source!.id));
}

async function replan(setup: PlanningSetup) {
  return planningCaller(setup).planning.replan(planningBase(setup, (await currentTask(setup)).version));
}

describe("planning replan after an approved route", () => {
  it("starts a new analysis once the Issue changed after the approval", async () => {
    const setup = await publishedTask();
    await approved(setup);
    await changeSource(setup);
    expect((await readPlanning(setup)).replannable).toBe(true);
    const receipt = await replan(setup);
    expect(await currentTask(setup)).toMatchObject({ planningStatus: "in_progress", planningOperationId: receipt.operationId, activeOperationId: receipt.operationId });
  });

  it("keeps the approved planning while the Issue is unchanged", async () => {
    const setup = await publishedTask();
    await approved(setup);
    expect((await readPlanning(setup)).replannable).toBe(false);
    expect(await rejection(replan(setup))).toMatchObject({ code: "CONFLICT", reason: "replan_unavailable" });
    expect((await currentTask(setup)).planningStatus).toBe("approved");
  });

  it("rejects a replan before the planning is approved", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    expect(await rejection(replan(setup))).toMatchObject({ code: "CONFLICT", reason: "replan_unavailable" });
  });

  it("replays the same request without a second analysis", async () => {
    const setup = await publishedTask();
    await approved(setup);
    await changeSource(setup);
    const input = planningBase(setup, (await currentTask(setup)).version);
    const first = await planningCaller(setup).planning.replan(input);
    const second = await planningCaller(setup).planning.replan(input);
    expect(second.operationId).toBe(first.operationId);
  });
});
