import { afterEach, describe, expect, it } from "vitest";
import type { AgentAccountHome } from "../src/application/agent-accounts/agentAccountHome";
import { SessionAccountGate } from "../src/application/services/terminal/sessionAccountGate";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { taskAgentAccounts, taskTerminalSessions } from "../src/infra/database/schema";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { messagesOf, workerWorld } from "./session-worker-support";
import { sessionRowOf } from "./session-interaction-support";
import { seedStoredPlan, seedTaskSet } from "./plan-support";
import { startItem } from "./plan-open-support";
import { MODEL_STATUS, scriptedCodexRuntime } from "./support/codexRuntimeHarness";
import { cleanupCodexFolders, setup, writeTurnScript } from "./support/codexRuntimeFixture";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); await cleanupCodexFolders(); });

const LIMIT_ERROR = { message: "You've hit your usage limit.", codexErrorInfo: "usageLimitExceeded", additionalDetails: null };
const LIMIT_NOTIFICATION = { jsonrpc: "2.0" as const, method: "error", params: { threadId: "thread-1", turnId: "turn-1", willRetry: false, error: LIMIT_ERROR } };
const CHOICE = { agent: "codex" as const, model: "model-1", effort: "high" };

async function codexAccountWorld() {
  const world = await workerWorld({}, {}, { codexProbe: { read: async () => MODEL_STATUS } });
  const hostId = machineIdentity();
  await new DrizzleSessionHostDao(world.setup.database).publishCodexStatus({ hostId, status: MODEL_STATUS });
  const accounts = new DrizzleAgentAccountDao(world.setup.database);
  const account = await accounts.insert({ ownerUserId: world.setup.ownerId, hostId, provider: "codex", label: "Codex B" });
  await accounts.saveCheck({ id: account.id, status: "logged_in", identity: null, plan: null, codexCatalog: MODEL_STATUS, checkedAt: new Date(MODEL_STATUS.refreshedAt) });
  await world.setup.database.insert(taskAgentAccounts).values({ taskId: world.setup.taskId, provider: "codex", accountId: account.id, chosenBy: world.setup.ownerId, version: 1 });
  const home: AgentAccountHome = { pathOf: ({ id }) => `/accounts/${id}`, ensure: async ({ id }) => `/accounts/${id}`, logoutAndDelete: async () => ({ logout: "ok" }) };
  const gate = new SessionAccountGate({ accounts, home, inspector: { inspect: async () => ({ status: "logged_in", identity: null, plan: null, detail: null }) }, hostId });
  return { world, gate };
}

describe("Codex account usage limit in the worker", () => {
  it("V-07d ends a Codex session on Codex B with the account limit reason and opens no other session", async () => {
    const { world, gate } = await codexAccountWorld();
    const files = await setup();
    await writeTurnScript(files, [LIMIT_NOTIFICATION]);
    world.worker = world.build({ runtimes: { codex: scriptedCodexRuntime(files.scriptPath) }, accountGate: gate });
    await seedTaskSet(world, { ids: ["task_01"] });
    const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01"], choice: CHOICE }] });
    const { sessionId } = await startItem(world, { kind: "plan_item", planItemId: items[0]!.id });
    await world.worker.supervisor.tick();
    await expect.poll(async () => (await sessionRowOf(world.setup, sessionId)).status, { timeout: 10_000 }).toBe("interrupted");
    expect((await messagesOf(world, sessionId)).map((message) => message.content)).toContain("Limite de uso da conta Codex B atingido");
    expect(await world.setup.database.select().from(taskTerminalSessions)).toHaveLength(1);
  });
});
