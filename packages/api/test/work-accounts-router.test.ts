import { afterEach, describe, expect, it } from "vitest";
import type { AgentAccountHome } from "../src/application/agent-accounts/agentAccountHome";
import { AgentAccountService } from "../src/application/services/agent-accounts/agentAccountService";
import { WorkAccountService } from "../src/application/services/agent-accounts/workAccountService";
import { AgentAccountController } from "../src/controllers/agentAccountController";
import { WorkAccountController } from "../src/controllers/workAccountController";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { DrizzleTaskAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleTaskAgentAccountDao";
import { createWorkAccountsRouter } from "../src/routers/workAccounts";
import { closeTaskFixture } from "./task-api-support";
import { terminalHarness } from "./terminal-harness";
import { cleanupTerminalFolders } from "./terminal-support";
import { executionWorld, seedSession } from "./terminal-execution-support";
import { AssignedIssueError } from "../src/application/services/assigned-issues/assignedIssueErrors";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

describe("tasks.workAccounts and session history", () => {
  it("V-06f returns owner-aware live labels and operator-only work choices", async () => {
    const world = await executionWorld();
    const { setup } = world;
    const accounts = new DrizzleAgentAccountDao(setup.database);
    const home: AgentAccountHome = { pathOf: ({ id }) => `/state/${id}`, ensure: async ({ id }) => `/state/${id}`, logoutAndDelete: async () => ({ logout: "ok" }) };
    const service = new AgentAccountService({ accounts, home, inspector: { inspect: async () => ({ status: "logged_out" as const, identity: null, plan: null, detail: null }) }, hostId: "host-h", log: () => undefined });
    const account = await service.create(setup.ownerId, { provider: "codex", label: "Codex A" });
    const session = await seedSession(world, { status: "running", agent: "codex", agentAccountId: account.id });
    const defaultSession = await seedSession(world, { status: "running", agent: "claude", agentAccountId: null });
    const workService = new WorkAccountService({ choices: new DrizzleTaskAgentAccountDao(setup.database), accounts, home, hostId: "host-h", authorization: { requireOperate: async ({ actorId }: { projectId: string; taskId: string; actorId: string }) => { if (actorId !== setup.ownerId) throw new AssignedIssueError("operator_required"); } } as never });
    const router = createWorkAccountsRouter(new WorkAccountController(workService));
    const ana = router.createCaller({ principal: { userId: setup.ownerId }, requestId: "work-accounts" });
    const bruno = router.createCaller({ principal: { userId: setup.readerId }, requestId: "work-accounts" });
    await setup.authorize(setup.readerId);
    const harness = await terminalHarness(setup);
    const scope = { projectId: setup.project.id, taskId: setup.taskId };
    await ana.set({ taskId: setup.taskId, provider: "codex", accountId: account.id, version: 0 });
    expect(await ana.get({ taskId: setup.taskId })).toMatchObject({ choices: [{ provider: "claude", accountId: null }, { provider: "codex", accountId: account.id, label: "Codex A" }], version: 1 });
    expect((await harness.callerFor(setup.ownerId).byId(scope)).execution.sessions.find((row) => row.id === session.id)?.account).toEqual({ kind: "own", label: "Codex A", removed: false });
    expect((await harness.callerFor(setup.readerId).byId(scope)).execution.sessions.find((row) => row.id === session.id)?.account).toEqual({ kind: "other", label: null, removed: false });
    await expect(bruno.get({ taskId: setup.taskId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await service.rename(setup.ownerId, { id: account.id, label: "Codex Principal", version: account.version });
    expect((await harness.callerFor(setup.ownerId).byId(scope)).execution.sessions.find((row) => row.id === session.id)?.account).toMatchObject({ label: "Codex Principal" });
    await accounts.markRemoved({ id: account.id, at: new Date("2026-11-25T00:00:00.000Z") });
    expect((await harness.callerFor(setup.ownerId).byId(scope)).execution.sessions.find((row) => row.id === session.id)?.account).toMatchObject({ kind: "own", label: "Codex Principal", removed: true });
    for (const userId of [setup.ownerId, setup.readerId]) {
      expect((await harness.callerFor(userId).byId(scope)).execution.sessions.find((row) => row.id === defaultSession.id)?.account).toEqual({ kind: "default", label: null, removed: false });
    }
  });
});
