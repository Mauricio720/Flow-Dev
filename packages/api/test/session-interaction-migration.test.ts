import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalMessages, taskTerminalRequests, taskTerminalSessions, terminalSessionHosts } from "../src/infra/database/schema";
import { applyMigration } from "./database";
import { closeTaskFixture } from "./task-api-support";
import { flowDevWorld } from "./session-interaction-support";
import { world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

const MIGRATION = "0048_session_interaction";
const ROLLBACK = `${MIGRATION}_rollback`;
const MAX_MESSAGE_LENGTH = 50_000;

describe("0048 session interaction migration", () => {
  it("V-32a keeps a Spec B session as runtime terminal with permission mode bypass", async () => {
    const { setup, decisionId } = await world();
    await applyMigration(setup.client, ROLLBACK);
    const id = crypto.randomUUID();
    await setup.client`insert into task_terminal_sessions (id, task_id, project_id, user_id, planning_decision_id, route, request_key, checkout_path, dirty, status) values (${id}, ${setup.taskId}, ${setup.project.id}, ${setup.ownerId}, ${decisionId}, 'tech_spec', ${crypto.randomUUID()}, '/work/shop', false, 'waiting')`;
    await applyMigration(setup.client, MIGRATION);
    const [row] = await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, id));
    expect(row).toMatchObject({ status: "waiting", runtime: "terminal", permissionMode: "bypass", hostId: null, workerId: null, interruptRequestedAt: null, endRequestedAt: null });
  });

  it("V-32a accepts asking and interrupted and rejects a runtime outside terminal and flow_dev", async () => {
    const { setup, session } = await flowDevWorld();
    for (const status of ["asking", "interrupted"]) await setup.database.update(taskTerminalSessions).set({ status }).where(eq(taskTerminalSessions.id, session.id));
    await expect(setup.database.update(taskTerminalSessions).set({ runtime: "gnome" }).where(eq(taskTerminalSessions.id, session.id))).rejects.toThrow();
    await expect(setup.database.update(taskTerminalSessions).set({ permissionMode: "ask" }).where(eq(taskTerminalSessions.id, session.id))).rejects.toThrow();
    await expect(setup.database.update(taskTerminalSessions).set({ status: "paused" }).where(eq(taskTerminalSessions.id, session.id))).rejects.toThrow();
  });

  it("rejects a message role, a content over 50000 characters, a request kind and a request status outside the checks", async () => {
    const { setup, session } = await flowDevWorld();
    const message = { sessionId: session.id, role: "user", content: "oi" };
    await expect(setup.database.insert(taskTerminalMessages).values({ ...message, role: "tool" })).rejects.toThrow();
    await expect(setup.database.insert(taskTerminalMessages).values({ ...message, content: "x".repeat(MAX_MESSAGE_LENGTH + 1) })).rejects.toThrow();
    await setup.database.insert(taskTerminalMessages).values({ ...message, content: "x".repeat(MAX_MESSAGE_LENGTH) });
    const request = { sessionId: session.id, kind: "question", toolUseId: "toolu_1", payload: {} };
    await expect(setup.database.insert(taskTerminalRequests).values({ ...request, kind: "elicitation" })).rejects.toThrow();
    await expect(setup.database.insert(taskTerminalRequests).values({ ...request, status: "expired" })).rejects.toThrow();
    const [stored] = await setup.database.insert(taskTerminalRequests).values(request).returning();
    expect(stored).toMatchObject({ status: "pending", answer: null, answeredBy: null, answeredAt: null });
  });

  it("allows one message per request key in a session and any number without a key", async () => {
    const { setup, session } = await flowDevWorld();
    const keyed = { sessionId: session.id, role: "user", content: "oi", requestKey: crypto.randomUUID() };
    await setup.database.insert(taskTerminalMessages).values(keyed);
    await expect(setup.database.insert(taskTerminalMessages).values(keyed)).rejects.toThrow();
    await setup.database.insert(taskTerminalMessages).values([{ sessionId: session.id, role: "assistant", content: "a" }, { sessionId: session.id, role: "assistant", content: "b" }]);
    expect(await setup.database.select().from(taskTerminalMessages)).toHaveLength(3);
  });

  it("deletes the messages and requests together with the session", async () => {
    const { setup, session } = await flowDevWorld();
    await setup.database.insert(taskTerminalMessages).values({ sessionId: session.id, role: "user", content: "oi" });
    await setup.database.insert(taskTerminalRequests).values({ sessionId: session.id, kind: "permission", toolUseId: "toolu_1", payload: {} });
    await setup.database.delete(taskTerminalSessions).where(eq(taskTerminalSessions.id, session.id));
    expect(await setup.database.select().from(taskTerminalMessages)).toHaveLength(0);
    expect(await setup.database.select().from(taskTerminalRequests)).toHaveLength(0);
  });

  it("keeps one heartbeat row per host", async () => {
    const { setup } = await flowDevWorld();
    await setup.database.insert(terminalSessionHosts).values({ hostId: "maquina:ana", workerId: "w1" });
    await expect(setup.database.insert(terminalSessionHosts).values({ hostId: "maquina:ana", workerId: "w2" })).rejects.toThrow();
  });

  it("V-32a removes the new tables and columns on rollback, maps the new statuses back and applies again", async () => {
    const { setup, session } = await flowDevWorld({ status: "asking" });
    await applyMigration(setup.client, ROLLBACK);
    const tables = await setup.client`select table_name from information_schema.tables where table_name in ('task_terminal_messages','task_terminal_requests','terminal_session_hosts')`;
    expect(tables).toHaveLength(0);
    const columns = await setup.client`select column_name from information_schema.columns where table_name = 'task_terminal_sessions' and column_name in ('runtime','permission_mode','host_id','worker_id','interrupt_requested_at','end_requested_at')`;
    expect(columns).toHaveLength(0);
    const [status] = await setup.client`select status from task_terminal_sessions where id = ${session.id}`;
    expect(status!.status).toBe("waiting");
    await applyMigration(setup.client, MIGRATION);
    const restored = await setup.client`select table_name from information_schema.tables where table_name in ('task_terminal_messages','task_terminal_requests','terminal_session_hosts')`;
    expect(restored).toHaveLength(3);
  });
});
