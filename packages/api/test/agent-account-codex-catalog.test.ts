import { afterEach, describe, expect, it } from "vitest";
import type { AgentAccountHome } from "../src/application/agent-accounts/agentAccountHome";
import { AgentAccountService } from "../src/application/services/agent-accounts/agentAccountService";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { taskAgentAccounts } from "../src/infra/database/schema";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { workerWorld } from "./session-worker-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const ACCOUNT_MODEL = "gpt-c-1";
const PURPOSE = { kind: "route" as const, choice: { agent: "codex" as const, model: ACCOUNT_MODEL, effort: "high" } };
const catalog = (model: string) => ({ available: true, reason: null, version: "0.159.3", refreshedAt: "2026-11-23T14:32:00.000Z", models: [{ id: model, label: model, isDefault: true, efforts: ["high"], defaultEffort: "high" }] });
const home: AgentAccountHome = { pathOf: ({ id }) => `/accounts/${id}`, ensure: async ({ id }) => `/accounts/${id}`, logoutAndDelete: async () => ({ logout: "ok" }) };

async function accountWorld() {
  const world = await workerWorld();
  await new DrizzleSessionHostDao(world.setup.database).publishCodexStatus({ hostId: machineIdentity(), status: catalog("machine-model") });
  const probeHomes: Array<string | undefined> = [];
  const codexProbe = { read: async (input?: { codexHome?: string }) => { probeHomes.push(input?.codexHome); return catalog(ACCOUNT_MODEL); } };
  const inspector = { inspect: async () => ({ status: "logged_in" as const, identity: null, plan: null, detail: null }) };
  const service = new AgentAccountService({ accounts: new DrizzleAgentAccountDao(world.setup.database), home, inspector, codexProbe, hostId: machineIdentity(), log: () => undefined });
  return { world, service, probeHomes };
}

describe("Codex account catalog after login", () => {
  it("V-08b offers the account models right after Verificar login and reads them only once", async () => {
    const { world, service, probeHomes } = await accountWorld();
    const account = await service.create(world.setup.ownerId, { provider: "codex", label: "Codex C" });
    await world.setup.database.insert(taskAgentAccounts).values({ taskId: world.setup.taskId, provider: "codex", accountId: account.id, chosenBy: world.setup.ownerId, version: 1 });
    const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
    const before = await world.harness.caller.terminal.preflight({ ...scope, purpose: PURPOSE });
    expect(before.agents.find((agent) => agent.agent === "codex")).toMatchObject({ available: false });
    await service.verify(world.setup.ownerId, { id: account.id });
    const after = await world.harness.caller.terminal.preflight({ ...scope, purpose: PURPOSE });
    expect(after.agents.find((agent) => agent.agent === "codex")).toMatchObject({ available: true, modelOptions: [{ id: ACCOUNT_MODEL }] });
    await service.verify(world.setup.ownerId, { id: account.id });
    expect(probeHomes).toEqual([`/accounts/${account.id}`]);
  });
});
