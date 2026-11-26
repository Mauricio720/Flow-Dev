import { afterEach, describe, expect, it } from "vitest";
import { taskRouteSwitches, taskTerminalSessions } from "../src/infra/database/schema";
import { applyMigration } from "./database";
import { closeTaskFixture } from "./task-api-support";
import { sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

async function violated(operation: Promise<unknown>) {
  try {
    await operation;
    return null;
  } catch (error) {
    return (error as { cause?: { constraint_name?: string } }).cause?.constraint_name ?? "other";
  }
}

describe("0055 route switches migration", () => {
  it("V-10c enforces values, partial uniqueness and rollback", async () => {
    const { setup, decisionId } = await world();
    const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId)).returning();
    const base = { taskId: setup.taskId, planningDecisionId: decisionId, sessionId: session!.id, fromRoute: "tech_spec", toRoute: "direct_execution", summary: "Resumo", reasons: ["Motivo"] };
    const insert = (overrides: Record<string, unknown> = {}) => setup.database.insert(taskRouteSwitches).values({ ...base, ...overrides } as never).returning();
    expect((await insert())[0]).toMatchObject({ status: "pending", decidedByUserId: null, decidedAt: null, decisionRequestKey: null });
    expect(await violated(insert({ toRoute: "prd" }))).toBe("task_route_switches_to_route_check");
    expect(await violated(insert({ status: "invalid", decidedByUserId: setup.ownerId, decidedAt: new Date("2026-11-25T09:00:00Z"), decisionRequestKey: crypto.randomUUID() }))).not.toBeNull();
    expect(await violated(insert({ reasons: Array.from({ length: 9 }, (_, index) => `Motivo ${index}`) }))).toBe("task_route_switches_reasons_check");
    expect(await violated(insert())).toBe("task_route_switches_session_pending_unique");
    await setup.database.update(taskRouteSwitches).set({ status: "confirmed", decidedByUserId: setup.ownerId, decidedAt: new Date("2026-11-25T10:00:00Z"), decisionRequestKey: crypto.randomUUID() });
    const [secondSession] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId)).returning();
    expect(await violated(insert({ sessionId: secondSession!.id, status: "confirmed", decidedByUserId: setup.ownerId, decidedAt: new Date("2026-11-25T10:01:00Z"), decisionRequestKey: crypto.randomUUID() }))).toBe("task_route_switches_decision_confirmed_unique");
    await applyMigration(setup.client, "0055_route_switches_rollback");
    const [tables] = await setup.client`select to_regclass('task_route_switches') as route_switches`;
    expect(tables!.route_switches).toBeNull();
    await applyMigration(setup.client, "0055_route_switches");
  });
});
