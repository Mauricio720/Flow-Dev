import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskPlanningDecisions, taskRouteSwitches, taskTerminalSessions, tasks, users } from "../src/infra/database/schema";
import { readProgress } from "../src/infra/database/dao/assigned-issues/workProgressReads";
import { ATTEMPT_ID, REVIEW_ASSESSMENT, planningCaller, publishedTask, seedPlanOperation, seedReview, type PlanningSetup } from "./planning-support";
import { closeTaskFixture } from "./task-api-support";
import { sessionValues } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

const PROPOSED_AT = new Date("2026-11-25T10:00:00.000Z");
const REPLAN_OPERATION_ID = "00000000-0000-4000-8000-0000000000a4";
const REPLAN_APPROVED_AT = new Date("2026-11-25T12:00:00.000Z");
const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

async function switchedDecisionSetup() {
  const setup = await publishedTask();
  await setup.database.update(users).set({ displayName: "Ana" }).where(eq(users.id, setup.ownerId));
  await seedReview(setup, { recommendedRoute: "prd", selectedRoute: "prd" });
  const [decision] = await setup.database.select().from(taskPlanningDecisions);
  const [confirmedSession, pendingSession, declinedSession] = await setup.database.insert(taskTerminalSessions).values([
    sessionValues(setup, decision!.id, { route: "prd", status: "waiting" }),
    sessionValues(setup, decision!.id, { route: "prd", status: "waiting" }),
    sessionValues(setup, decision!.id, { route: "prd", status: "waiting" }),
  ]).returning();
  await setup.database.insert(taskRouteSwitches).values([
    { taskId: setup.taskId, planningDecisionId: decision!.id, sessionId: confirmedSession!.id, fromRoute: "prd", toRoute: "direct_execution", summary: "Escopo definido.", reasons: ["Sem ambiguidade."], status: "confirmed", decidedByUserId: setup.ownerId, decidedAt: new Date("2026-11-25T10:06:00.000Z"), decisionRequestKey: crypto.randomUUID(), proposedAt: PROPOSED_AT },
    { taskId: setup.taskId, planningDecisionId: decision!.id, sessionId: pendingSession!.id, fromRoute: "prd", toRoute: "direct_execution", summary: "Pendente.", reasons: ["Aguardando."], proposedAt: PROPOSED_AT },
    { taskId: setup.taskId, planningDecisionId: decision!.id, sessionId: declinedSession!.id, fromRoute: "prd", toRoute: "direct_execution", summary: "Recusada.", reasons: ["Continuar spec."], status: "declined", decidedByUserId: setup.ownerId, decidedAt: PROPOSED_AT, decisionRequestKey: crypto.randomUUID() },
  ]);
  return { setup, decision: decision! };
}

async function approveReplan(setup: PlanningSetup, previous: typeof taskPlanningDecisions.$inferSelect) {
  await seedPlanOperation(setup, "succeeded", REPLAN_OPERATION_ID, "review");
  const createdAt = new Date(previous.createdAt.getTime() + ONE_HOUR_IN_MILLISECONDS);
  const [inReview] = await setup.database.insert(taskPlanningDecisions).values({ ...REVIEW_ASSESSMENT, taskId: setup.taskId, publicationAttemptId: ATTEMPT_ID, operationId: REPLAN_OPERATION_ID, executionId: crypto.randomUUID(), createdAt }).returning();
  const [approved] = await setup.database.update(taskPlanningDecisions).set({ status: "approved", approvedByUserId: setup.ownerId, approvedAt: REPLAN_APPROVED_AT }).where(eq(taskPlanningDecisions.id, inReview!.id)).returning();
  await setup.database.update(tasks).set({ planningStatus: "approved", planningDecisionId: approved!.id }).where(eq(tasks.id, setup.taskId));
  return approved!;
}

describe("effective route in planning and assigned work reads", () => {
  it("V-07a, V-07b and V-07c use only the confirmed switch on the current decision", async () => {
    const { setup, decision } = await switchedDecisionSetup();
    expect(await readProgress(setup.database, [setup.taskId])).toEqual(new Map([[setup.taskId, { route: "direct_execution" }]]));
    const detail = await planningCaller(setup).byId({ projectId: setup.project.id, taskId: setup.taskId });
    expect(detail.planning).toMatchObject({ decision: { recommendedRoute: "prd", selectedRoute: "prd" }, routeSwitch: { fromRoute: "prd", toRoute: "direct_execution", state: "confirmed", decidedAt: "2026-11-25T10:06:00.000Z", proposedAt: PROPOSED_AT.toISOString(), reasons: ["Sem ambiguidade."] } });
    expect(detail.planning.routeSwitch?.decidedBy).toBe("Ana");
    expect(await setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.planningDecisionId, decision.id))).toHaveLength(3);
  });

  it("V-07f drops the switch of the replaced decision once a replan is approved", async () => {
    const { setup, decision } = await switchedDecisionSetup();
    const replanned = await approveReplan(setup, decision);
    const detail = await planningCaller(setup).byId({ projectId: setup.project.id, taskId: setup.taskId });
    const confirmed = await setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.status, "confirmed"));
    expect(confirmed).toMatchObject([{ planningDecisionId: decision.id }]);
    expect(await readProgress(setup.database, [setup.taskId])).toEqual(new Map([[setup.taskId, { route: "tech_spec" }]]));
    expect(detail.planning.decision?.id).toBe(replanned.id);
    expect(detail.planning.routeSwitch).toBeNull();
  });
});
