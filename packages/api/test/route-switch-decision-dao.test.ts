import { afterEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { DrizzleRouteSwitchDao } from "../src/infra/database/dao/terminal/drizzleRouteSwitchDao";
import { taskRouteSwitches, taskTerminalMessages, taskTerminalSessions } from "../src/infra/database/schema";
import { DrizzleSessionMessageDao } from "../src/infra/database/dao/terminal/drizzleSessionMessageDao";
import { closeTaskFixture } from "./task-api-support";
import { sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

const PROPOSED_AT = new Date("2026-11-25T10:00:00Z");
const DECIDED_AT = new Date("2026-11-25T10:06:00Z");

async function setupProposal() {
  const { setup, decisionId } = await world();
  const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId)).returning();
  const dao = new DrizzleRouteSwitchDao(setup.database);
  const proposal = await dao.insertPending({ taskId: setup.taskId, planningDecisionId: decisionId, sessionId: session!.id, fromRoute: "tech_spec", summary: "Resumo", reasons: ["Motivo"], proposedAt: PROPOSED_AT });
  return { setup, dao, session: session!, record: proposal.record };
}

function decisionInput(record: { id: string; sessionId: string }, actorId: string, requestKey: string, decision: "confirm" | "decline") {
  return { proposalId: record.id, sessionId: record.sessionId, actorId, requestKey, decision, decidedAt: DECIDED_AT, message: `Mensagem ${decision}` };
}

describe("route switch decision DAO", () => {
  it("V-05d rolls back the proposal update when the message request key already exists", async () => {
    const { setup, dao, session, record } = await setupProposal();
    const requestKey = crypto.randomUUID();
    await new DrizzleSessionMessageDao(setup.database).insertUserMessage({ sessionId: session.id, content: "Mensagem anterior", requestKey });
    await expect(dao.decide(decisionInput(record, setup.ownerId, requestKey, "confirm"))).rejects.toThrow("route_switch_message_conflict");
    const [stored] = await setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.id, record.id));
    const messages = await setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, session.id));
    expect(stored!.status).toBe("pending");
    expect(messages).toHaveLength(1);
  });

  it("V-06b allows only one winner when confirm and decline race", async () => {
    const { setup, dao, session, record } = await setupProposal();
    const outcomes = await Promise.all([dao.decide(decisionInput(record, setup.ownerId, crypto.randomUUID(), "confirm")), dao.decide(decisionInput(record, setup.ownerId, crypto.randomUUID(), "decline"))]);
    const status = (await setup.database.select({ status: taskRouteSwitches.status }).from(taskRouteSwitches).where(eq(taskRouteSwitches.id, record.id)))[0]!.status;
    const messages = await setup.database.select().from(taskTerminalMessages).where(and(eq(taskTerminalMessages.sessionId, session.id), eq(taskTerminalMessages.role, "user")));
    expect(outcomes.map((result) => result.outcome).sort()).toEqual(["already_decided", "decided"]);
    expect(outcomes.find((result) => result.outcome === "decided")!.record!.status).toBe(status);
    expect(messages).toHaveLength(1);
  });

  it("V-06c replays the original decision without inserting a second message", async () => {
    const { setup, dao, session, record } = await setupProposal();
    const input = decisionInput(record, setup.ownerId, crypto.randomUUID(), "confirm");
    const first = await dao.decide(input);
    const replay = await dao.decide(input);
    const messages = await setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, session.id));
    expect(first.outcome).toBe("decided");
    expect(replay).toMatchObject({ outcome: "replayed", record: { status: "confirmed", decidedAt: DECIDED_AT } });
    expect(messages).toHaveLength(1);
  });
});
