import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskRouteSwitches, taskTerminalSessions, tasks } from "../src/infra/database/schema";
import { DrizzleRouteSwitchDao } from "../src/infra/database/dao/terminal/drizzleRouteSwitchDao";
import { closeTaskFixture } from "./task-api-support";
import { sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

describe("RouteSwitchDao", () => {
  it("V-03b returns the existing pending proposal on a repeated insert", async () => {
    const { setup, decisionId } = await world();
    const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId)).returning();
    const dao = new DrizzleRouteSwitchDao(setup.database);
    const input = { taskId: setup.taskId, planningDecisionId: decisionId, sessionId: session!.id, fromRoute: "tech_spec" as const, summary: "Resumo direto", reasons: ["Escopo definido"], proposedAt: new Date("2026-11-25T10:00:00Z") };
    const first = await dao.insertPending(input);
    const second = await dao.insertPending({ ...input, proposedAt: new Date("2026-11-25T10:01:00Z") });
    expect(first.created).toBe(true);
    expect(second).toMatchObject({ created: false, record: { id: first.record.id, status: "pending", proposedAt: input.proposedAt } });
    expect(await setup.database.select().from(taskRouteSwitches).where(eq(taskRouteSwitches.sessionId, session!.id))).toHaveLength(1);
  });

  it("reads the route proposal context when there is no answered question", async () => {
    const { setup, decisionId } = await world();
    await setup.database.update(tasks).set({ planningDecisionId: decisionId }).where(eq(tasks.id, setup.taskId));
    const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { status: "interrupted" })).returning();
    const context = await new DrizzleRouteSwitchDao(setup.database).readProposalContext(session!.id);
    expect(context).toMatchObject({ session: { id: session!.id, taskId: setup.taskId, route: "tech_spec", status: "interrupted", purpose: "route" }, currentDecisionId: decisionId, hasConfirmedSwitch: false, hasCapturedSpec: false, hasPendingProposal: false, lastDeclinedAt: null, lastAnsweredAt: null });
  });
});
