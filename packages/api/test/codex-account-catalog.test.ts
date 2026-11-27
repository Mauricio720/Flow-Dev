import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { DrizzleTaskAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleTaskAgentAccountDao";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { taskAgentAccounts, taskTerminalSessions } from "../src/infra/database/schema";
import { FileAgentAccountHome } from "../src/infra/agents/fileAgentAccountHome";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders, openInput } from "./terminal-support";
import { workerWorld } from "./session-worker-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

describe("Codex account catalog", () => {
  it("V-08b previews and validates the chosen account and falls back to the machine catalog", async () => {
    const world = await workerWorld();
    const accounts = new DrizzleAgentAccountDao(world.setup.database);
    const choices = new DrizzleTaskAgentAccountDao(world.setup.database);
    const hosts = new DrizzleSessionHostDao(world.setup.database);
    const now = new Date("2026-11-23T14:32:00.000Z");
    const machineCatalog = catalog("machine-model");
    await hosts.publishCodexStatus({ hostId: machineIdentity(), status: machineCatalog });
    const codexB = await accounts.insert({ ownerUserId: world.setup.ownerId, hostId: machineIdentity(), provider: "codex", label: "Codex B" });
    const codexC = await accounts.insert({ ownerUserId: world.setup.ownerId, hostId: machineIdentity(), provider: "codex", label: "Codex C" });
    await accounts.saveCheck({ id: codexB.id, status: "logged_out", identity: null, plan: null, codexCatalog: catalog("old-model"), checkedAt: now });
    await accounts.saveCheck({ id: codexC.id, status: "logged_in", identity: null, plan: null, codexCatalog: catalog("gpt-c-1"), checkedAt: now });
    await world.setup.database.insert(taskAgentAccounts).values({ taskId: world.setup.taskId, provider: "codex", accountId: codexB.id, chosenBy: world.setup.ownerId, version: 1 });
    const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
    const purpose = { kind: "route" as const, choice: { agent: "codex" as const, model: "gpt-c-1", effort: "high" } };
    const input = { ...openInput(world.setup), purpose };
    const home = new FileAgentAccountHome(world.harness.env).pathOf(codexB);
    const previewB = await world.harness.caller.terminal.preflight({ ...scope, purpose });
    expect(previewB.agents.find((agent) => agent.agent === "codex")).toMatchObject({ available: false, reason: `A conta Codex B (Codex) não está logada. Rode \`CODEX_HOME='${home}' codex login\`.` });
    await world.setup.database.update(taskAgentAccounts).set({ accountId: codexC.id, version: 2 }).where(eq(taskAgentAccounts.taskId, world.setup.taskId));
    const previewC = await world.harness.caller.terminal.preflight({ ...scope, purpose });
    expect(previewC.agents.find((agent) => agent.agent === "codex")).toMatchObject({ available: true, modelOptions: [{ id: "gpt-c-1" }] });
    const opened = await world.harness.caller.terminal.open(input);
    expect(await world.setup.database.select().from(taskAgentAccounts).where(eq(taskAgentAccounts.taskId, world.setup.taskId))).toMatchObject([{ accountId: codexC.id }]);
    expect(await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, opened.sessionId))).toMatchObject([{ agentAccountId: codexC.id, agent: "codex", model: "gpt-c-1" }]);
    expect(opened.sessionId).toEqual(expect.any(String));
    await choices.set({ taskId: world.setup.taskId, provider: "codex", accountId: null, chosenBy: world.setup.ownerId, version: 2 });
    const defaultPreview = await world.harness.caller.terminal.preflight({ ...scope, purpose });
    expect(defaultPreview.agents.find((agent) => agent.agent === "codex")).toMatchObject({ available: true, modelOptions: [{ id: "machine-model" }] });
  });
});

function catalog(model: string) {
  return { available: true, reason: null, version: "0.159.3", refreshedAt: "2026-11-23T14:32:00.000Z", models: [{ id: model, label: model, isDefault: true, efforts: ["high"], defaultEffort: "high" }] };
}
