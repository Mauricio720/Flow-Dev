import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { DrizzleSessionControlDao } from "../src/infra/database/dao/terminal/drizzleSessionControlDao";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { HOST_ID, OTHER_HOST_ID, flowDevWorld, insertFlowDevSession } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

const NOW = new Date("2026-11-23T14:32:00Z");

describe("session host DAO", () => {
  it("keeps one row per host and replaces the worker and the time on each beat", async () => {
    const { setup } = await flowDevWorld();
    const hosts = new DrizzleSessionHostDao(setup.database);
    expect(await hosts.lastBeat(HOST_ID)).toBeNull();
    await hosts.beat({ hostId: HOST_ID, workerId: "w1", heartbeatAt: NOW });
    const later = new Date(NOW.getTime() + 5_000);
    await hosts.beat({ hostId: HOST_ID, workerId: "w2", heartbeatAt: later });
    expect(await hosts.lastBeat(HOST_ID)).toEqual({ hostId: HOST_ID, workerId: "w2", heartbeatAt: later });
  });
});

describe("session control DAO", () => {
  it("claims only the unclaimed opening or unconfirmed sessions of the own host, one worker per session", async () => {
    const { setup, decisionId, session } = await flowDevWorld({ status: "opening" });
    await insertFlowDevSession(setup, decisionId, { hostId: OTHER_HOST_ID });
    await insertFlowDevSession(setup, decisionId, { status: "running" });
    const control = new DrizzleSessionControlDao(setup.database);
    const claims = await Promise.all([control.claimOpening({ hostId: HOST_ID, workerId: "w1" }), control.claimOpening({ hostId: HOST_ID, workerId: "w2" })]);
    const claimed = claims.filter((claim) => claim !== null);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({ id: session.id, status: "opening" });
    expect(await control.claimOpening({ hostId: HOST_ID, workerId: "w3" })).toBeNull();
  });

  it("also claims a session that expired to unconfirmed before the service picked it up", async () => {
    const { setup, session } = await flowDevWorld({ status: "unconfirmed" });
    const control = new DrizzleSessionControlDao(setup.database);
    expect(await control.claimOpening({ hostId: HOST_ID, workerId: "w1" })).toMatchObject({ id: session.id, workerId: "w1" });
  });

  it("marks as interrupted only the active sessions of the host that belong to another worker", async () => {
    const { setup, decisionId, session } = await flowDevWorld({ status: "asking", workerId: "w1" });
    const own = await insertFlowDevSession(setup, decisionId, { status: "running", workerId: "w2" });
    const ended = await insertFlowDevSession(setup, decisionId, { status: "ended", workerId: "w1" });
    const foreign = await insertFlowDevSession(setup, decisionId, { status: "running", workerId: "w1", hostId: OTHER_HOST_ID });
    const unclaimed = await insertFlowDevSession(setup, decisionId, { status: "opening" });
    const control = new DrizzleSessionControlDao(setup.database);
    expect(await control.markOrphans({ hostId: HOST_ID, workerId: "w2" })).toEqual([session.id]);
    const statusOf = async (id: string) => (await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, id)))[0]!.status;
    expect([await statusOf(session.id), await statusOf(own.id), await statusOf(ended.id), await statusOf(foreign.id), await statusOf(unclaimed.id)]).toEqual(["interrupted", "running", "ended", "running", "opening"]);
  });

  it("records interrupt and end requests only for an active session and clears them one by one", async () => {
    const { setup, decisionId, session } = await flowDevWorld({ status: "running" });
    const ended = await insertFlowDevSession(setup, decisionId, { status: "ended" });
    const control = new DrizzleSessionControlDao(setup.database);
    expect(await control.requestInterrupt(session.id, NOW)).toBe(true);
    expect(await control.requestEnd(session.id, NOW)).toBe(true);
    expect(await control.requestInterrupt(ended.id, NOW)).toBe(false);
    await control.clearControl(session.id, "interrupt");
    const [row] = await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, session.id));
    expect(row).toMatchObject({ interruptRequestedAt: null, endRequestedAt: NOW });
  });
});
