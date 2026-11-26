import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { DrizzleTerminalExecutionDao } from "../src/infra/database/dao/terminal/drizzleTerminalExecutionDao";
import { taskRouteSwitches, taskTerminalMessages, taskTerminalSessions } from "../src/infra/database/schema";
import { openedFlowDevSession, setStatus } from "./session-interaction-support";
import { at } from "./session-timeline-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { sessionValues } from "./terminal-tracking-support";
import { HARNESS_NOW } from "./terminal-harness";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

describe("route switch in session history and timeline", () => {
  it("V-07g maps the confirmed session, V-07h through V-07j show and refresh the proposal", async () => {
    const world = await openedFlowDevSession();
    const [sourceSession] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, world.sessionId));
    const firstTime = new Date("2026-11-23T11:00:00.000Z");
    await world.setup.database.update(taskTerminalSessions).set({ route: "prd", openedAt: firstTime, status: "ended" }).where(eq(taskTerminalSessions.id, world.sessionId));
    const [second] = await world.setup.database.insert(taskTerminalSessions).values(sessionValues(world.setup, sourceSession!.planningDecisionId, { route: "prd", openedAt: new Date("2026-11-23T12:00:00.000Z"), status: "waiting" })).returning();
    const proposalAt = at(0);
    const [proposal] = await world.setup.database.insert(taskRouteSwitches).values({ taskId: world.setup.taskId, planningDecisionId: sourceSession!.planningDecisionId, sessionId: second!.id, fromRoute: "prd", toRoute: "direct_execution", summary: "Escopo definido.", reasons: ["Sem ambiguidade."], proposedAt: proposalAt }).returning();
    await world.setup.database.insert(taskTerminalMessages).values({ sessionId: second!.id, role: "assistant", content: "Explicação.\n\n```flow-dev-troca-de-rota\nrota: execucao_direta\nresumo: Escopo definido.\n- Sem ambiguidade.\n```", occurredAt: new Date(proposalAt.getTime() - 1_000) });
    const firstPage = await world.harness.caller.session.timeline({ projectId: world.setup.project.id, taskId: world.setup.taskId, sessionId: second!.id });
    expect(firstPage.entries).toMatchObject([{ type: "message", role: "assistant", content: "Explicação." }, { type: "route_switch", proposal: { state: "pending", fromRoute: "prd" }, at: proposalAt.toISOString() }]);
    const executionDao = new DrizzleTerminalExecutionDao(world.setup.database);
    expect(await executionDao.sessionsOf(world.setup.taskId)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: world.sessionId, route: "prd", switchedTo: null }),
      expect.objectContaining({ id: second!.id, route: "prd", switchedTo: null }),
    ]));
    await setStatus(world.setup, second!.id, "ended");
    const expiredEntries = (await world.harness.caller.session.timeline({ projectId: world.setup.project.id, taskId: world.setup.taskId, sessionId: second!.id })).entries;
    expect(expiredEntries.find((entry) => entry.type === "route_switch")).toMatchObject({ proposal: { state: "expired" } });
    await world.setup.database.update(taskRouteSwitches).set({ status: "confirmed", decidedByUserId: world.setup.ownerId, decidedAt: HARNESS_NOW, decisionRequestKey: crypto.randomUUID() }).where(eq(taskRouteSwitches.id, proposal!.id));
    const refreshed = await world.harness.caller.session.timeline({ projectId: world.setup.project.id, taskId: world.setup.taskId, sessionId: second!.id, after: firstPage.cursor });
    expect(refreshed.entries).toMatchObject([{ type: "route_switch", proposal: { state: "confirmed", decidedAt: HARNESS_NOW.toISOString() } }]);
    expect(await executionDao.sessionsOf(world.setup.taskId)).toEqual(expect.arrayContaining([expect.objectContaining({ id: second!.id, route: "prd", switchedTo: "direct_execution" })]));
  });
});
