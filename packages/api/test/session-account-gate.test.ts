import { afterEach, describe, expect, it } from "vitest";
import type { AgentAccountHome } from "../src/application/agent-accounts/agentAccountHome";
import { AgentAccountService } from "../src/application/services/agent-accounts/agentAccountService";
import { SessionAccountGate } from "../src/application/services/terminal/sessionAccountGate";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { taskAgentAccounts } from "../src/infra/database/schema";
import { agentAccounts } from "../src/infra/database/schema";
import { eq } from "drizzle-orm";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { cycle, messagesOf, sendMessage, workerWorld } from "./session-worker-support";
import { sessionRowOf } from "./session-interaction-support";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

async function setupAccount(status: "logged_in" | "logged_out" = "logged_in") {
  let inspection = status;
  const world = await workerWorld();
  const accounts = new DrizzleAgentAccountDao(world.setup.database);
  const home: AgentAccountHome = { pathOf: ({ id }) => `/accounts/${id}`, ensure: async ({ id }) => `/accounts/${id}`, logoutAndDelete: async () => ({ logout: "ok" }) };
  const service = new AgentAccountService({ accounts, home, inspector: { inspect: async () => ({ status: "logged_in" as const, identity: null, plan: null, detail: null }) }, hostId: machineIdentity(), log: () => undefined });
  const account = await service.create(world.setup.ownerId, { provider: "claude", label: "Trabalho" });
  await world.setup.database.insert(taskAgentAccounts).values({ taskId: world.setup.taskId, provider: "claude", accountId: account.id, chosenBy: world.setup.ownerId, version: 1 });
  const gate = new SessionAccountGate({ accounts, home, inspector: { inspect: async () => ({ status: inspection, identity: null, plan: null, detail: null }) }, hostId: machineIdentity(), timeoutMs: 50 });
  world.worker = world.build({ accountGate: gate });
  return { world, account, gate, setInspection: (next: "logged_in" | "logged_out") => { inspection = next; }, accounts };
}

describe("session account gate", () => {
  it("V-07a and V-09c fail opening before the runtime for logged out, foreign host, or foreign owner accounts", async () => {
    const { world, account, accounts } = await setupAccount("logged_out");
    const id = await world.open();
    await cycle(world);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ launchError: "A conta Trabalho (Claude Code) não está logada. Rode `CLAUDE_CONFIG_DIR='/accounts/" + account.id + "' claude auth login`." });
    expect(world.runtime.starts).toHaveLength(0);
    await accounts.saveCheck({ id: account.id, status: "logged_in", identity: null, plan: null, checkedAt: new Date() });
    await world.setup.database.update(agentAccounts).set({ hostId: "other-host" }).where(eq(agentAccounts.id, account.id));
    const next = await world.open({ requestKey: crypto.randomUUID() });
    await cycle(world);
    expect(await sessionRowOf(world.setup, next)).toMatchObject({ launchError: "A conta desta sessão não está disponível nesta máquina." });
    expect(world.runtime.starts).toHaveLength(0);
    await world.setup.database.update(agentAccounts).set({ hostId: machineIdentity(), ownerUserId: world.setup.ownerId }).where(eq(agentAccounts.id, account.id));
    const foreignOwnerSession = await world.open({ requestKey: crypto.randomUUID() });
    await world.setup.database.update(agentAccounts).set({ ownerUserId: world.setup.readerId }).where(eq(agentAccounts.id, account.id));
    await cycle(world);
    expect(await sessionRowOf(world.setup, foreignOwnerSession)).toMatchObject({ launchError: "A conta desta sessão não está disponível nesta máquina." });
    expect(world.runtime.starts).toHaveLength(0);
  });

  it("V-07b times out login inspection without blocking the next worker tick", async () => {
    const { world } = await setupAccount();
    world.worker = world.build({ accountGate: new SessionAccountGate({ accounts: new DrizzleAgentAccountDao(world.setup.database), home: { pathOf: () => "/account", ensure: async () => "/account", logoutAndDelete: async () => ({ logout: "ok" }) }, inspector: { inspect: () => new Promise(() => undefined) }, hostId: machineIdentity(), timeoutMs: 5 }) });
    const id = await world.open();
    await cycle(world);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ launchError: "Não foi possível verificar o login da conta Trabalho. Tente de novo." });
  });

  it("V-07e fails a resumed account after claim and leaves its queued message undelivered", async () => {
    const { world, gate, account, setInspection } = await setupAccount();
    const id = await world.open();
    await cycle(world);
    await sendMessage(world, id, "Continuar");
    await world.setup.client`update task_terminal_sessions set status = 'interrupted', worker_id = 'w-old' where id = ${id}`;
    setInspection("logged_out");
    const runtime = new ScriptedSessionRuntime();
    const worker = world.build({ runtimes: { claude: runtime }, workerId: "worker-2", accountGate: gate });
    await worker.supervisor.tick();
    expect(runtime.resumes).toHaveLength(0);
    const reason = `A conta Trabalho (Claude Code) não está logada. Rode \`CLAUDE_CONFIG_DIR='/accounts/${account.id}' claude auth login\`.`;
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "ended", endReason: reason });
    expect((await messagesOf(world, id)).find((row) => row.content === "Continuar")).toMatchObject({ undelivered: true, deliveredAt: null });
    expect((await messagesOf(world, id)).map((row) => row.content)).toContain(reason);
  });
});
