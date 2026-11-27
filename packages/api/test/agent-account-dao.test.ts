import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { AgentAccountLabelTaken } from "../src/application/agent-accounts/agentAccountDao";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { agentAccounts, taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

describe("DrizzleAgentAccountDao", () => {
  it("V-14b enforces active labels by owner, host and provider and counts open sessions", async () => {
    const { setup, decisionId } = await world();
    const dao = new DrizzleAgentAccountDao(setup.database);
    const created = await dao.insert({ ownerUserId: setup.ownerId, hostId: "host-h", provider: "claude", label: "Pessoal" });
    await expect(dao.insert({ ownerUserId: setup.ownerId, hostId: "host-h", provider: "claude", label: "pessoal" })).rejects.toBeInstanceOf(AgentAccountLabelTaken);
    await expect(dao.insert({ ownerUserId: setup.ownerId, hostId: "host-h", provider: "codex", label: "Pessoal" })).resolves.toMatchObject({ label: "Pessoal" });
    await expect(dao.insert({ ownerUserId: setup.readerId, hostId: "host-h", provider: "claude", label: "Pessoal" })).resolves.toMatchObject({ label: "Pessoal" });
    const renamed = await dao.rename({ id: created.id, label: "Trabalho", version: created.version });
    expect(renamed).toMatchObject({ label: "Trabalho", version: 2 });
    expect(await dao.rename({ id: created.id, label: "Antigo", version: created.version })).toBeNull();
    await dao.markRemoved({ id: created.id, at: new Date("2026-11-25T00:00:00.000Z") });
    expect((await dao.listActive({ ownerUserId: setup.ownerId, hostId: "host-h" })).map(({ label }) => label)).toEqual(["Pessoal"]);
    const replacement = await dao.insert({ ownerUserId: setup.ownerId, hostId: "host-h", provider: "claude", label: "Pessoal" });
    const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId)).returning();
    await setup.client`update task_terminal_sessions set agent_account_id = ${replacement.id} where id = ${session!.id}`;
    expect(await dao.countOpenSessions(replacement.id)).toBe(1);
    await setup.client`update task_terminal_sessions set status = 'ended', ended_at = now() where id = ${session!.id}`;
    expect(await dao.countOpenSessions(replacement.id)).toBe(0);
    await expect(setup.database.delete(agentAccounts).where(eq(agentAccounts.id, replacement.id))).rejects.toBeDefined();
  });
});
