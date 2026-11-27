import { afterEach, describe, expect, it } from "vitest";
import type { AgentAccountHome } from "../src/application/agent-accounts/agentAccountHome";
import { SessionAccountGate } from "../src/application/services/terminal/sessionAccountGate";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { taskAgentAccounts } from "../src/infra/database/schema";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { cycle, sendMessage, workerWorld } from "./session-worker-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

async function accountRuntime() {
  const world = await workerWorld();
  const accounts = new DrizzleAgentAccountDao(world.setup.database);
  const account = await accounts.insert({ ownerUserId: world.setup.ownerId, hostId: machineIdentity(), provider: "claude", label: "Pessoal" });
  await world.setup.database.insert(taskAgentAccounts).values({ taskId: world.setup.taskId, provider: "claude", accountId: account.id, chosenBy: world.setup.ownerId, version: 1 });
  const home: AgentAccountHome = { pathOf: ({ id }) => `/accounts/${id}`, ensure: async ({ id }) => `/accounts/${id}`, logoutAndDelete: async () => ({ logout: "ok" }) };
  const gate = new SessionAccountGate({ accounts, home, inspector: { inspect: async () => ({ status: "logged_in", identity: null, plan: null, detail: null }) }, hostId: machineIdentity() });
  return { world, account, gate };
}

describe("session account environments", () => {
  it("V-06b preserves the account home across start and resume", async () => {
    const { world, account, gate } = await accountRuntime();
    world.worker = world.build({ accountGate: gate });
    const id = await world.open();
    await cycle(world);
    expect(world.runtime.starts[0]?.credentialHome).toBe(`/accounts/${account.id}`);
    await sendMessage(world, id, "Continue");
    await world.setup.client`update task_terminal_sessions set status = 'interrupted', worker_id = 'w-old' where id = ${id}`;
    const resumedRuntime = new ScriptedSessionRuntime();
    const worker = world.build({ runtimes: { claude: resumedRuntime }, workerId: "worker-2", accountGate: gate });
    await worker.supervisor.tick();
    expect(resumedRuntime.resumes[0]?.credentialHome).toBe(`/accounts/${account.id}`);
  });

  it("V-10b omits credentialHome for the default login", async () => {
    const world = await workerWorld();
    const id = await world.open();
    await cycle(world);
    expect(world.runtime.starts[0]?.sessionId).toBe(id);
    expect(world.runtime.starts[0]?.credentialHome).toBeUndefined();
  });
});
