import { afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { ROUTE_SWITCH_CONFIRMED_MESSAGE } from "../src/application/services/terminal/terminalPromptCopy";
import { createSessionControllers } from "../src/infra/sessionInteractionComposition";
import { createSessionRouter } from "../src/routers/session";
import { DrizzleRouteSwitchDao } from "../src/infra/database/dao/terminal/drizzleRouteSwitchDao";
import { taskRouteSwitches, taskTerminalMessages, taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

async function setup(status: string = "waiting") {
  const { setup, decisionId } = await world();
  const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { runtime: "flow_dev", route: "prd", status })).returning();
  const dao = new DrizzleRouteSwitchDao(setup.database);
  const proposal = await dao.insertPending({ taskId: setup.taskId, planningDecisionId: decisionId, sessionId: session!.id, fromRoute: "prd", summary: "Resumo", reasons: ["Motivo"], proposedAt: new Date("2026-11-25T10:00:00Z") });
  const controllers = createSessionControllers(setup.database, { workAuthorization: { requireOperate: async ({ projectId, taskId, actorId }) => ({ projectId, taskId, actorId, sourceSnapshotId: "snapshot", claimRevision: 1 }) }, now: () => new Date("2026-11-25T10:06:00Z") });
  const router = createSessionRouter(() => controllers);
  const caller = (userId: string) => router.createCaller({ principal: { userId }, requestId: "route-switch-test" });
  const input = { projectId: setup.project.id, taskId: setup.taskId, sessionId: session!.id, proposalId: proposal.record.id, decision: "confirm" as const, requestKey: crypto.randomUUID() };
  return { setup, decisionId, session: session!, proposal: proposal.record, dao, caller, input };
}

describe("tasks.session.decideRouteSwitch errors", () => {
  it("V-06a denies a reader without changing the pending proposal or adding a message", async () => {
    const context = await setup();
    const error = await context.caller(context.setup.readerId).decideRouteSwitch(context.input).then(() => null, (caught: { code: string; message: string; cause?: { reason: string } }) => caught);
    const [proposal] = await context.setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.id, context.proposal.id));
    const messages = await context.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, context.session.id));
    expect(error).toMatchObject({ code: "FORBIDDEN", cause: { reason: "session_control_denied" } });
    expect(proposal!.status).toBe("pending");
    expect(messages).toEqual([]);
  });

  it("V-06d refuses an ended session and keeps its proposal pending", async () => {
    const context = await setup("ended");
    const error = await context.caller(context.setup.ownerId).decideRouteSwitch(context.input).then(() => null, (caught: { code: string; cause?: { reason: string } }) => caught);
    const [proposal] = await context.setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.id, context.proposal.id));
    expect(error).toMatchObject({ code: "PRECONDITION_FAILED", cause: { reason: "session_not_active" } });
    expect(proposal!.status).toBe("pending");
  });

  it("V-06e rejects a second decision with the specified conflict message", async () => {
    const context = await setup();
    await context.caller(context.setup.ownerId).decideRouteSwitch(context.input);
    const error = await context.caller(context.setup.ownerId).decideRouteSwitch({ ...context.input, decision: "decline", requestKey: crypto.randomUUID() }).then(() => null, (caught: { code: string; message: string; cause?: { reason: string } }) => caught);
    const [proposal] = await context.setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.id, context.proposal.id));
    expect(error).toMatchObject({ code: "CONFLICT", message: "Essa proposta já foi decidida.", cause: { reason: "route_switch_decided" } });
    expect(proposal!.status).toBe("confirmed");
  });

  it("V-06f returns not found for a proposal belonging to another session", async () => {
    const context = await setup();
    const [otherSession] = await context.setup.database.insert(taskTerminalSessions).values(sessionValues(context.setup, context.decisionId, { runtime: "flow_dev", route: "prd" })).returning();
    const other = await context.dao.insertPending({ taskId: context.setup.taskId, planningDecisionId: context.decisionId, sessionId: otherSession!.id, fromRoute: "prd", summary: "Outro", reasons: ["Motivo"], proposedAt: new Date("2026-11-25T10:01:00Z") });
    const error = await context.caller(context.setup.ownerId).decideRouteSwitch({ ...context.input, proposalId: other.record.id }).then(() => null, (caught: { code: string; cause?: { reason: string } }) => caught);
    const [proposal] = await context.setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.id, other.record.id));
    expect(error).toMatchObject({ code: "NOT_FOUND", cause: { reason: "route_switch_not_found" } });
    expect(proposal!.status).toBe("pending");
  });

  it("RN-03 refuses to confirm a second proposal of the same decision and writes no message", async () => {
    const context = await setup();
    const [secondSession] = await context.setup.database.insert(taskTerminalSessions).values(sessionValues(context.setup, context.decisionId, { runtime: "flow_dev", route: "prd", status: "waiting" })).returning();
    const second = await context.dao.insertPending({ taskId: context.setup.taskId, planningDecisionId: context.decisionId, sessionId: secondSession!.id, fromRoute: "prd", summary: "Outra", reasons: ["Motivo"], proposedAt: new Date("2026-11-25T10:01:00Z") });
    const owner = context.caller(context.setup.ownerId);
    const first = await owner.decideRouteSwitch(context.input);
    const error = await owner.decideRouteSwitch({ ...context.input, sessionId: secondSession!.id, proposalId: second.record.id, requestKey: crypto.randomUUID() }).then(() => null, (caught: { code: string; message: string; cause?: { reason: string } }) => caught);
    const [stored] = await context.setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.id, second.record.id));
    const messages = await context.setup.database.select().from(taskTerminalMessages).where(inArray(taskTerminalMessages.sessionId, [context.session.id, secondSession!.id]));
    expect(first.proposal.state).toBe("confirmed");
    expect(error).toMatchObject({ code: "CONFLICT", message: "Essa proposta já foi decidida.", cause: { reason: "route_switch_decided" } });
    expect(stored).toMatchObject({ status: "pending", decidedByUserId: null, decidedAt: null, decisionRequestKey: null });
    expect(messages).toEqual([expect.objectContaining({ sessionId: context.session.id, role: "user", content: ROUTE_SWITCH_CONFIRMED_MESSAGE })]);
  });
});
