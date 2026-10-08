import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskPlanningDecisions, taskCommandReceipts } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { currentTask, planningBase, planningCaller, publishedTask, rejection, reviewState, seedPlanOperation, seedReview, type PlanningSetup } from "./planning-support";

afterEach(async () => { vi.restoreAllMocks(); await closeTaskFixture(); });

async function selection(setup: PlanningSetup, selectedRoute: "direct_execution" | "tech_spec" | "prd") {
  const state = await reviewState(setup);
  return { ...planningBase(setup, state.version), decisionId: state.decision.id, expectedDecisionVersion: state.decision.version, selectedRoute };
}

async function approval(setup: PlanningSetup, reviewedRoute: "direct_execution" | "tech_spec" | "prd") {
  const { selectedRoute: _selected, ...input } = await selection(setup, reviewedRoute);
  return { ...input, reviewedRoute };
}

describe("planning route selection", () => {
  it("IT-034 and IT-035 save overrides and restore the AI source", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const caller = planningCaller(setup);
    await caller.planning.selectRoute(await selection(setup, "prd"));
    const overridden = await reviewState(setup);
    expect(overridden.decision).toMatchObject({ selectedRoute: "prd", decisionSource: "HUMAN_OVERRIDE", version: 2, recommendedRoute: "tech_spec", summary: "Resumo" });
    await caller.planning.selectRoute(await selection(setup, "tech_spec"));
    expect((await reviewState(setup)).decision).toMatchObject({ decisionSource: "AI", version: 3, status: "review" });
  });

  it("IT-036 stores a receipt for an identical selection without changing versions", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const before = await reviewState(setup);
    await planningCaller(setup).planning.selectRoute(await selection(setup, "tech_spec"));
    const after = await reviewState(setup);
    expect(after).toEqual(before);
    expect(await setup.database.select().from(taskCommandReceipts)).toHaveLength(1);
  });

  it("IT-037 accepts only one of two competing selections", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const caller = planningCaller(setup);
    const [first, second] = [await selection(setup, "prd"), await selection(setup, "direct_execution")];
    const results = await Promise.allSettled([caller.planning.selectRoute(first), caller.planning.selectRoute(second)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((results.find((result) => result.status === "rejected") as PromiseRejectedResult).reason.cause.reason).toBe("planning_conflict");
  });

  it("IT-044 rejects selection after approval", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    await planningCaller(setup).planning.approve(await approval(setup, "tech_spec"));
    expect(await rejection(planningCaller(setup).planning.selectRoute(await selection(setup, "prd")))).toMatchObject({ code: "CONFLICT", reason: "planning_approved" });
    expect((await reviewState(setup)).decision.selectedRoute).toBe("tech_spec");
  });

  it("IT-045 rejects selection and approval before a decision exists", async () => {
    const setup = await publishedTask();
    await seedPlanOperation(setup, "running");
    const base = { ...planningBase(setup), decisionId: crypto.randomUUID(), expectedDecisionVersion: 1 };
    const caller = planningCaller(setup);
    expect(await rejection(caller.planning.selectRoute({ ...base, selectedRoute: "prd" }))).toMatchObject({ code: "CONFLICT", reason: "planning_not_ready" });
    expect(await rejection(caller.planning.approve({ ...base, requestKey: crypto.randomUUID(), reviewedRoute: "prd" }))).toMatchObject({ reason: "planning_not_ready" });
  });

  it("IT-046 hides decisions that belong to another item", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const state = await reviewState(setup);
    const base = { ...planningBase(setup, state.version), decisionId: crypto.randomUUID(), expectedDecisionVersion: 1 };
    expect(await rejection(planningCaller(setup).planning.selectRoute({ ...base, selectedRoute: "prd" }))).toEqual({ code: "NOT_FOUND", reason: "decision_unavailable", retryAfterSeconds: undefined });
  });
});

describe("planning approval", () => {
  it("IT-038 approves the exact saved review keeping uncertainties", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    await planningCaller(setup).planning.approve(await approval(setup, "tech_spec"));
    const { decision } = await reviewState(setup);
    expect(decision).toMatchObject({ status: "approved", approvedByUserId: setup.ownerId, uncertainties: ["Falta contexto"] });
    expect(decision.approvedAt).toEqual(expect.any(String));
  });

  it("IT-039 rejects approval of a route changed back to the same value", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const caller = planningCaller(setup);
    const stale = await approval(setup, "tech_spec");
    await caller.planning.selectRoute(await selection(setup, "prd"));
    await caller.planning.selectRoute(await selection(setup, "tech_spec"));
    expect(await rejection(caller.planning.approve(stale))).toMatchObject({ code: "CONFLICT", reason: "planning_conflict" });
  });

  it("IT-040 produces one coherent winner for approval and route races", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const caller = planningCaller(setup);
    const [approve, select] = [await approval(setup, "tech_spec"), await selection(setup, "prd")];
    await Promise.allSettled([caller.planning.approve(approve), caller.planning.selectRoute(select)]);
    const row = (await setup.database.select().from(taskPlanningDecisions))[0]!;
    if (row.status === "approved") expect(row.selectedRoute).toBe("tech_spec");
    else expect(row.selectedRoute).toBe("prd");
  });

  it("IT-041 resolves equal concurrent approvals to one outcome", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const caller = planningCaller(setup);
    const input = await approval(setup, "tech_spec");
    const [first, second] = await Promise.all([caller.planning.approve(input), caller.planning.approve(input)]);
    expect(first).toEqual(second);
    expect((await setup.database.select().from(taskPlanningDecisions)).filter((row) => row.status === "approved")).toHaveLength(1);
  });

  it("IT-042 and IT-043 replay exact approvals and conflict on different ones", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const caller = planningCaller(setup);
    const original = await approval(setup, "tech_spec");
    await caller.planning.approve(original);
    const stored = (await setup.database.select().from(taskPlanningDecisions))[0]!;
    const replay = await caller.planning.approve({ ...original, requestKey: crypto.randomUUID() });
    expect(replay.decisionId).toBe(stored.id);
    expect((await setup.database.select().from(taskPlanningDecisions))[0]!.approvedAt).toEqual(stored.approvedAt);
    expect(await rejection(caller.planning.approve({ ...original, requestKey: crypto.randomUUID(), reviewedRoute: "prd" }))).toMatchObject({ reason: "planning_conflict" });
    expect(await rejection(caller.planning.approve({ ...original, requestKey: crypto.randomUUID(), expectedDecisionVersion: 2 }))).toMatchObject({ reason: "planning_conflict" });
  });

  it("IT-092 leaves the review untouched when the approval cannot be committed", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    await setup.database.execute(`CREATE FUNCTION fail_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'receipt failure'; END; $$` as never);
    await setup.database.execute(`CREATE TRIGGER fail_receipt BEFORE INSERT ON task_command_receipts FOR EACH ROW EXECUTE FUNCTION fail_receipt()` as never);
    expect(await rejection(planningCaller(setup).planning.approve(await approval(setup, "tech_spec")))).toMatchObject({ reason: "service_unavailable" });
    expect((await setup.database.select().from(taskPlanningDecisions))[0]).toMatchObject({ status: "review", approvedByUserId: null, approvedAt: null });
    expect(await currentTask(setup)).toMatchObject({ planningStatus: "review" });
  });

  it("IT-093 denies a nonauthor route change and keeps the author's approval", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    await setup.authorize(setup.readerId);
    const selectionInput = await selection(setup, "prd");
    await planningCaller(setup).planning.approve(await approval(setup, "tech_spec"));
    expect(await rejection(planningCaller(setup, setup.readerId).planning.selectRoute(selectionInput))).toMatchObject({ code: "FORBIDDEN", reason: "operator_required" });
    expect((await setup.database.select().from(taskPlanningDecisions))[0]).toMatchObject({ status: "approved", selectedRoute: "tech_spec", approvedByUserId: setup.ownerId });
  });

  it("IT-086 logs exactly one approval event after the commit", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const input = await approval(setup, "tech_spec");
    await setup.database.execute(`CREATE FUNCTION fail_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'receipt failure'; END; $$` as never);
    await setup.database.execute(`CREATE TRIGGER fail_receipt BEFORE INSERT ON task_command_receipts FOR EACH ROW EXECUTE FUNCTION fail_receipt()` as never);
    await rejection(planningCaller(setup).planning.approve(input));
    await setup.database.execute(`DROP TRIGGER fail_receipt ON task_command_receipts` as never);
    await planningCaller(setup).planning.approve(input);
    const events = info.mock.calls.map((call) => String(call[0])).filter((line) => line.includes("planning.approved"));
    expect(events).toHaveLength(1);
    expect(events[0]).not.toContain("Resumo");
    expect(await setup.database.select().from(taskPlanningDecisions).where(eq(taskPlanningDecisions.status, "approved"))).toHaveLength(1);
  });
});
