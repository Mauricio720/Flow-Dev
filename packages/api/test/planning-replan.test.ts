import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskExecutionActions, taskExecutionPlans, taskExecutionRuns } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { currentTask, planningBase, planningCaller, publishedTask, readPlanning, rejection, reviewState, seedReview, type PlanningSetup } from "./planning-support";

afterEach(async () => { vi.restoreAllMocks(); await closeTaskFixture(); });

const DIRECT_ROUTE = { recommendedRoute: "direct_execution", selectedRoute: "direct_execution" };

async function approvedDirect(setup: PlanningSetup) {
  await seedReview(setup, DIRECT_ROUTE);
  const state = await reviewState(setup);
  await planningCaller(setup).planning.approve({ ...planningBase(setup, state.version), decisionId: state.decision.id, expectedDecisionVersion: state.decision.version, reviewedRoute: "direct_execution" });
}

async function seedDirectAction(setup: PlanningSetup, state: string) {
  const [plan] = await setup.database.insert(taskExecutionPlans).values({ taskId: setup.taskId, createdBy: setup.ownerId }).returning();
  const [action] = await setup.database.insert(taskExecutionActions).values({ planId: plan!.id, taskId: setup.taskId, position: 0, kind: "direct_execute", state }).returning();
  await setup.database.insert(taskExecutionRuns).values({ actionId: action!.id, taskId: setup.taskId, attemptNumber: 1, state, snapshot: { kind: "direct_execute" }, idempotencyKey: crypto.randomUUID(), requestedBy: setup.ownerId, isWrite: false });
  return { plan: plan!, action: action! };
}

async function replan(setup: PlanningSetup) {
  return planningCaller(setup).planning.replan(planningBase(setup, (await currentTask(setup)).version));
}

describe("planning replan after an approved route", () => {
  it("starts a new analysis and archives the stopped direct execution", async () => {
    const setup = await publishedTask();
    await approvedDirect(setup);
    const { plan, action } = await seedDirectAction(setup, "blocked");
    expect((await readPlanning(setup)).replannable).toBe(true);
    const receipt = await replan(setup);
    const task = await currentTask(setup);
    expect(task).toMatchObject({ planningStatus: "in_progress", planningOperationId: receipt.operationId, activeOperationId: receipt.operationId });
    const [archived] = await setup.database.select().from(taskExecutionActions).where(eq(taskExecutionActions.id, action.id));
    expect(archived!.supersededAt).toBeInstanceOf(Date);
    expect((await setup.database.select().from(taskExecutionPlans).where(eq(taskExecutionPlans.id, plan.id)))[0]).toMatchObject({ status: "planned", revision: plan.revision + 1 });
    expect(await setup.database.select().from(taskExecutionRuns).where(eq(taskExecutionRuns.actionId, action.id))).toHaveLength(1);
    await setup.database.insert(taskExecutionActions).values({ planId: plan.id, taskId: setup.taskId, position: 0, kind: "create_spec" });
  });

  it("keeps the approved planning while the direct execution is still running", async () => {
    const setup = await publishedTask();
    await approvedDirect(setup);
    await seedDirectAction(setup, "running");
    expect((await readPlanning(setup)).replannable).toBe(false);
    expect(await rejection(replan(setup))).toMatchObject({ code: "CONFLICT", reason: "replan_unavailable" });
    expect((await currentTask(setup)).planningStatus).toBe("approved");
  });

  it("rejects a replan before the planning is approved", async () => {
    const setup = await publishedTask();
    await seedReview(setup, DIRECT_ROUTE);
    expect(await rejection(replan(setup))).toMatchObject({ code: "CONFLICT", reason: "replan_unavailable" });
  });

  it("replays the same request without a second analysis", async () => {
    const setup = await publishedTask();
    await approvedDirect(setup);
    await seedDirectAction(setup, "failed");
    const input = planningBase(setup, (await currentTask(setup)).version);
    const first = await planningCaller(setup).planning.replan(input);
    const second = await planningCaller(setup).planning.replan(input);
    expect(second.operationId).toBe(first.operationId);
  });
});
