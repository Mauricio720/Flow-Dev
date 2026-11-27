import { afterEach, describe, expect, it } from "vitest";
import type { AgentAccountHome } from "../src/application/agent-accounts/agentAccountHome";
import { AgentAccountService } from "../src/application/services/agent-accounts/agentAccountService";
import { AgentAccountController } from "../src/controllers/agentAccountController";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { createAgentAccountsRouter } from "../src/routers/agentAccounts";
import { closeTaskFixture, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("agentAccounts router", () => {
  it("V-09a and V-09b isolate list, verify, rename and remove by authenticated owner", async () => {
    const setup = await taskFixture();
    const dao = new DrizzleAgentAccountDao(setup.database);
    const home: AgentAccountHome = { pathOf: ({ id }) => `/state/${id}`, ensure: async ({ id }) => `/state/${id}`, logoutAndDelete: async () => ({ logout: "ok" }) };
    const inspector = { inspect: async () => ({ status: "logged_in" as const, identity: "ana@exemplo.com", plan: "max", detail: null }) };
    const service = new AgentAccountService({ accounts: dao, home, inspector, hostId: "host-h", now: () => new Date("2026-11-25T12:00:00.000Z"), log: () => undefined });
    const router = createAgentAccountsRouter(new AgentAccountController(service));
    const ana = router.createCaller({ principal: { userId: setup.ownerId, sessionId: setup.sessionId }, requestId: "agent-accounts-test" });
    const bruno = router.createCaller({ principal: { userId: setup.readerId, sessionId: setup.sessionId }, requestId: "agent-accounts-test" });
    const account = await ana.create({ provider: "claude", label: "Pessoal" });
    expect(await bruno.list()).toEqual([]);
    await expect(bruno.verify({ id: account.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(bruno.rename({ id: account.id, label: "Outra", version: account.version })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(bruno.remove({ id: account.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await dao.findById(account.id)).toMatchObject({ label: "Pessoal", removedAt: null });
  });
});
