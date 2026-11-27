import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { AgentAccountHome } from "../src/application/agent-accounts/agentAccountHome";
import { AgentAccountService } from "../src/application/services/agent-accounts/agentAccountService";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { DrizzleTerminalSessionDao } from "../src/infra/database/dao/terminal/drizzleTerminalSessionDao";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture, taskFixture } from "./task-api-support";
import { sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

async function removalService(logout: "ok" | "failed" = "ok", existingSetup?: Awaited<ReturnType<typeof taskFixture>>) {
  const setup = existingSetup ?? await taskFixture();
  const dao = new DrizzleAgentAccountDao(setup.database);
  const deleted: string[] = [];
  const logs: string[] = [];
  const home: AgentAccountHome = {
    pathOf: ({ id }) => `/state/${id}`,
    ensure: async ({ id }) => `/state/${id}`,
    logoutAndDelete: async ({ id }) => { deleted.push(id); return { logout }; },
  };
  const service = new AgentAccountService({ accounts: dao, home, inspector: { inspect: async () => ({ status: "logged_out", identity: null, plan: null, detail: null }) }, hostId: "host-h", now: () => new Date("2026-11-25T12:00:00.000Z"), log: (message) => logs.push(message) });
  return { setup, dao, service, deleted, logs };
}

describe("AgentAccountService removal", () => {
  it("V-02f removes an idle account logically and logs out its directory", async () => {
    const { setup, dao, service, deleted } = await removalService();
    const account = await service.create(setup.ownerId, { provider: "codex", label: "Codex A" });
    await service.remove(setup.ownerId, { id: account.id });
    expect(deleted).toEqual([account.id]);
    expect(await dao.listActive({ ownerUserId: setup.ownerId, hostId: "host-h" })).toEqual([]);
    expect(await dao.findById(account.id)).toMatchObject({ label: "Codex A", removedAt: new Date("2026-11-25T12:00:00.000Z") });
  });

  it("V-02g refuses removal while a non-final session uses the account", async () => {
    const { setup, decisionId } = await world();
    const { dao, service, deleted } = await removalService("ok", setup);
    const account = await service.create(setup.ownerId, { provider: "codex", label: "Codex B" });
    const sessionDao = new DrizzleTerminalSessionDao(setup.database);
    const session = await sessionDao.create({ ...(sessionValues(setup, decisionId) as never), requestKey: crypto.randomUUID(), agentAccountId: account.id });
    await setup.database.update(taskTerminalSessions).set({ status: "interrupted" }).where(eq(taskTerminalSessions.id, session.session.id));
    await expect(service.remove(setup.ownerId, { id: account.id })).rejects.toMatchObject({ reason: "has_open_sessions", openSessionCount: 1, message: "Esta conta tem 1 sessão não encerrada. Encerre-a antes de remover a conta." });
    expect(await dao.listActive({ ownerUserId: setup.ownerId, hostId: "host-h" })).toHaveLength(1);
    expect(deleted).toEqual([]);
  });

  it("V-02h completes logical removal and records a failed logout", async () => {
    const { setup, dao, service, deleted, logs } = await removalService("failed");
    const account = await service.create(setup.ownerId, { provider: "codex", label: "Codex A" });
    await expect(service.remove(setup.ownerId, { id: account.id })).resolves.toEqual({ removed: true });
    expect(deleted).toEqual([account.id]);
    expect(await dao.listActive({ ownerUserId: setup.ownerId, hostId: "host-h" })).toEqual([]);
    expect(logs).toContain("[accounts] removed logout=failed");
  });
});
