import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalRequests, taskTerminalSessions, terminalSessionHosts } from "../src/infra/database/schema";
import { applyMigration } from "./database";
import { closeTaskFixture } from "./task-api-support";
import { flowDevWorld, insertPendingRequest } from "./session-interaction-support";
import { sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

const MIGRATION = "0051_codex_sessions";
const ROLLBACK = `${MIGRATION}_rollback`;

describe("0051 Codex session migration", () => {
  it("keeps Claude session identifiers and defaults new Codex data to null", async () => {
    const { setup, decisionId } = await world();
    const [legacy] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { claudeSessionId: "claude-existing" })).returning();
    await setup.database.insert(terminalSessionHosts).values({ hostId: "host:test", workerId: "worker:test" });
    await applyMigration(setup.client, ROLLBACK);
    await applyMigration(setup.client, MIGRATION);
    const [session] = await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, legacy!.id));
    const [host] = await setup.database.select().from(terminalSessionHosts).where(eq(terminalSessionHosts.hostId, "host:test"));
    expect(session).toMatchObject({ claudeSessionId: "claude-existing", agentVersion: null });
    expect(host?.codexStatus).toBeNull();
  });

  it("accepts new request kinds and blocks rollback while Codex data would be lost", async () => {
    const { setup, session } = await flowDevWorld();
    await setup.database.insert(terminalSessionHosts).values({ hostId: session.hostId!, workerId: "worker:test" });
    await applyMigration(setup.client, ROLLBACK);
    await applyMigration(setup.client, MIGRATION);
    await setup.database.update(taskTerminalSessions).set({ agentVersion: "0.159.3" }).where(eq(taskTerminalSessions.id, session.id));
    await setup.database.update(terminalSessionHosts).set({ codexStatus: { available: true } }).where(eq(terminalSessionHosts.hostId, session.hostId!));
    const request = await insertPendingRequest({ setup, sessionId: session.id }, "permission");
    await setup.client`update task_terminal_requests set kind = 'file_change' where id = ${request.id}`;
    await expect(applyMigration(setup.client, ROLLBACK)).rejects.toThrow(/Cannot roll back 0051/);
    const [stored] = await setup.database.select().from(taskTerminalRequests).where(eq(taskTerminalRequests.id, request.id));
    expect(stored?.kind).toBe("file_change");
    expect((await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, session.id)))[0]?.agentVersion).toBe("0.159.3");
  });

  it("rolls back only after Codex-only values are cleared, then reapplies", async () => {
    const { setup, session } = await flowDevWorld();
    await setup.database.insert(terminalSessionHosts).values({ hostId: session.hostId!, workerId: "worker:test" });
    await applyMigration(setup.client, ROLLBACK);
    await applyMigration(setup.client, MIGRATION);
    await setup.database.update(taskTerminalSessions).set({ agentVersion: null }).where(eq(taskTerminalSessions.id, session.id));
    await setup.database.update(terminalSessionHosts).set({ codexStatus: null }).where(eq(terminalSessionHosts.hostId, session.hostId!));
    await applyMigration(setup.client, ROLLBACK);
    const columns = await setup.client`select column_name from information_schema.columns where table_name in ('task_terminal_sessions','terminal_session_hosts') and column_name in ('agent_version','codex_status')`;
    expect(columns).toHaveLength(0);
    await expect(setup.client`insert into task_terminal_requests (session_id, kind, tool_use_id, payload) values (${session.id}, 'file_change', 'toolu_after_rollback', '{}'::jsonb)`).rejects.toThrow();
    await applyMigration(setup.client, MIGRATION);
  });
});
