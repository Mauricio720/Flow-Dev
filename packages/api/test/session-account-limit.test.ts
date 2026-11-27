import { afterEach, describe, expect, it } from "vitest";
import type { RuntimeHandle, RuntimeStartInput } from "../src/application/terminal/agentSessionRuntime";
import type { AgentAccountHome } from "../src/application/agent-accounts/agentAccountHome";
import { SessionAccountGate } from "../src/application/services/terminal/sessionAccountGate";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { taskAgentAccounts, taskTerminalSessions } from "../src/infra/database/schema";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { messagesOf, workerWorld } from "./session-worker-support";
import { sessionRowOf } from "./session-interaction-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

function limitRuntime() {
  const handle: RuntimeHandle = { push: () => undefined, interrupt: async () => undefined, close: async () => undefined, abandon: async () => undefined };
  return { start: (input: RuntimeStartInput) => { setTimeout(() => { input.handlers.onAssistantText("Resposta parcial"); input.handlers.onExit({ kind: "crashed", detail: "You've hit your usage limit", limit: true }); }, 0); return handle; }, resume: () => handle };
}

describe("account usage limit", () => {
  it("V-07c keeps emitted text and ends the opening with the selected account label", async () => {
    const world = await workerWorld();
    const accounts = new DrizzleAgentAccountDao(world.setup.database);
    const account = await accounts.insert({ ownerUserId: world.setup.ownerId, hostId: machineIdentity(), provider: "claude", label: "Pessoal" });
    await world.setup.database.insert(taskAgentAccounts).values({ taskId: world.setup.taskId, provider: "claude", accountId: account.id, chosenBy: world.setup.ownerId, version: 1 });
    const home: AgentAccountHome = { pathOf: () => `/accounts/${account.id}`, ensure: async () => `/accounts/${account.id}`, logoutAndDelete: async () => ({ logout: "ok" }) };
    const gate = new SessionAccountGate({ accounts, home, inspector: { inspect: async () => ({ status: "logged_in", identity: null, plan: null, detail: null }) }, hostId: machineIdentity() });
    world.worker = world.build({ runtimes: { claude: limitRuntime() }, accountGate: gate });
    const sessionId = await world.open();
    await world.worker.supervisor.tick();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(await sessionRowOf(world.setup, sessionId)).toMatchObject({ status: "interrupted" });
    expect((await messagesOf(world, sessionId)).map((message) => message.content)).toContain("Resposta parcial");
    expect((await messagesOf(world, sessionId)).map((message) => message.content)).toContain("Limite de uso da conta Pessoal atingido");
    expect(await world.setup.database.select().from(taskTerminalSessions)).toHaveLength(1);
  });
});
