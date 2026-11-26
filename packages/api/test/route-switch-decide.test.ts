import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { RouteSwitchService } from "../src/application/services/terminal/routeSwitchService";
import { ROUTE_SWITCH_CONFIRMED_MESSAGE, ROUTE_SWITCH_DECLINED_MESSAGE } from "../src/application/services/terminal/terminalPromptCopy";
import { SessionControlAuthorization } from "../src/application/services/terminal/sessionControlAuthorization";
import { RouteSwitchController } from "../src/controllers/routeSwitchController";
import { DrizzleRouteSwitchDao } from "../src/infra/database/dao/terminal/drizzleRouteSwitchDao";
import { DrizzleSessionMessageDao } from "../src/infra/database/dao/terminal/drizzleSessionMessageDao";
import { DrizzleTerminalSessionDao } from "../src/infra/database/dao/terminal/drizzleTerminalSessionDao";
import { taskRouteSwitches, taskTerminalMessages, taskTerminalSessions, users } from "../src/infra/database/schema";
import type { SessionLog, SessionLogFields } from "../src/application/services/terminal/sessionLog";
import { closeTaskFixture } from "./task-api-support";
import { sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

const DECIDED_AT = new Date("2026-11-25T10:06:00Z");

async function decisionWorld(status: "waiting" | "interrupted" = "waiting") {
  const { setup, decisionId } = await world();
  await setup.database.update(users).set({ name: "Ana", displayName: "Ana" }).where(eq(users.id, setup.ownerId));
  const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { runtime: "flow_dev", route: "prd", status })).returning();
  const dao = new DrizzleRouteSwitchDao(setup.database);
  const stored = await dao.insertPending({ taskId: setup.taskId, planningDecisionId: decisionId, sessionId: session!.id, fromRoute: "prd", summary: "Mudança simples.", reasons: ["Escopo definido."], proposedAt: new Date("2026-11-25T10:00:00Z") });
  const entries: Array<{ event: string; fields: SessionLogFields }> = [];
  const log: SessionLog = { info: (event, fields = {}) => entries.push({ event, fields }), error: () => undefined };
  const messages = new DrizzleSessionMessageDao(setup.database);
  const service = new RouteSwitchService({ routeSwitches: dao, messages, log, now: () => DECIDED_AT });
  const control = new SessionControlAuthorization({ sessions: new DrizzleTerminalSessionDao(setup.database), authorization: { requireOperate: async ({ projectId, taskId, actorId }) => ({ projectId, taskId, actorId, sourceSnapshotId: "snapshot", claimRevision: 1 }) } });
  const controller = new RouteSwitchController({ control, routeSwitches: dao, service, log });
  const input = { projectId: setup.project.id, taskId: setup.taskId, sessionId: session!.id, proposalId: stored.record.id, decision: "confirm" as const, requestKey: crypto.randomUUID() };
  return { setup, session: session!, controller, input, entries, proposalId: stored.record.id };
}

describe("RouteSwitchController.decide", () => {
  it("V-05a confirms the proposal, queues the direct execution message and logs the decision", async () => {
    const context = await decisionWorld();
    const result = await context.controller.decide({ userId: context.setup.ownerId }, context.input);
    const [proposal] = await context.setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.id, context.proposalId));
    const [message] = await context.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, context.session.id));
    expect(proposal).toMatchObject({ status: "confirmed", fromRoute: "prd", toRoute: "direct_execution", decidedByUserId: context.setup.ownerId, decidedAt: DECIDED_AT, summary: "Mudança simples.", reasons: ["Escopo definido."] });
    expect(message!.content).toBe(ROUTE_SWITCH_CONFIRMED_MESSAGE);
    expect(message!.content.startsWith("/flow-dev:direct-executor")).toBe(true);
    expect(message!.deliveredAt).toBeNull();
    expect(result.proposal).toMatchObject({ state: "confirmed", decidedBy: "Ana", decidedAt: DECIDED_AT.toISOString() });
    expect(context.entries[0]).toEqual({ event: "route_switch_decided", fields: { proposalId: context.proposalId, decision: "confirm", actorId: context.setup.ownerId } });
  });

  it("V-05b records a decline and sends the exact continuation message", async () => {
    const context = await decisionWorld();
    const result = await context.controller.decide({ userId: context.setup.ownerId }, { ...context.input, decision: "decline" });
    const [proposal] = await context.setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.id, context.proposalId));
    const [message] = await context.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, context.session.id));
    expect(proposal).toMatchObject({ status: "declined", decidedByUserId: context.setup.ownerId, decidedAt: DECIDED_AT });
    expect(message!.content).toBe(ROUTE_SWITCH_DECLINED_MESSAGE);
    expect(result.proposal.state).toBe("declined");
  });

  it("V-05c accepts an interrupted session and leaves its decision message queued", async () => {
    const context = await decisionWorld("interrupted");
    const result = await context.controller.decide({ userId: context.setup.ownerId }, context.input);
    const [message] = await context.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, context.session.id));
    expect(result.proposal.state).toBe("confirmed");
    expect(message).toMatchObject({ role: "user", content: ROUTE_SWITCH_CONFIRMED_MESSAGE, deliveredAt: null, undelivered: false });
  });

  it("V-06c does not log the decision again when the same request key is replayed", async () => {
    const context = await decisionWorld();
    const first = await context.controller.decide({ userId: context.setup.ownerId }, context.input);
    const replay = await context.controller.decide({ userId: context.setup.ownerId }, context.input);
    expect(replay).toEqual(first);
    expect(context.entries.filter((entry) => entry.event === "route_switch_decided")).toHaveLength(1);
  });
});
