import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { AssignedIssueError } from "../src/application/services/assigned-issues/assignedIssueErrors";
import type { WorkAuthorization } from "../src/application/services/assigned-issues/workAuthorization";
import { WorkAccountService } from "../src/application/services/agent-accounts/workAccountService";
import { SessionLauncher } from "../src/application/services/terminal/sessionLauncher";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { DrizzleTaskAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleTaskAgentAccountDao";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { closeTaskFixture } from "./task-api-support";
import { approvedWork, gitClone, linkClone, openInput } from "./terminal-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";
import { NO_ATTACHMENT_LINKS } from "../src/application/database/dao/terminalAttachmentLinks";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

describe("work account session resolution", () => {
  it("V-06a copies the current Claude work account into the opened route session", async () => {
    const setup = await approvedWork();
    const clone = await gitClone();
    await linkClone(setup, clone);
    const harness = await terminalHarness(setup);
    const accounts = new DrizzleAgentAccountDao(setup.database);
    const account = await accounts.insert({ ownerUserId: setup.ownerId, hostId: machineIdentity(), provider: "claude", label: "Trabalho" });
    await new DrizzleTaskAgentAccountDao(setup.database).set({ taskId: setup.taskId, provider: "claude", accountId: account.id, chosenBy: setup.ownerId, version: 0 });
    const opened = await harness.caller.terminal.open(openInput(setup));
    const [session] = await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, opened.sessionId));
    expect(session?.agentAccountId).toBe(account.id);
  });

  it("V-05f and V-05g refuse removed or another person's selected account before session creation", async () => {
    const setup = await approvedWork();
    const accounts = new DrizzleAgentAccountDao(setup.database);
    const rows = new DrizzleTaskAgentAccountDao(setup.database);
    const personal = await accounts.insert({ ownerUserId: setup.ownerId, hostId: machineIdentity(), provider: "claude", label: "Pessoal" });
    const authorization = { requireOperate: async ({ actorId }: { projectId: string; taskId: string; actorId: string }) => { if (actorId !== setup.ownerId && actorId !== setup.readerId) throw new AssignedIssueError("operator_required"); } } as unknown as Pick<WorkAuthorization, "requireOperate">;
    const service = new WorkAccountService({ choices: rows, accounts, home: { pathOf: ({ id }) => id, ensure: async ({ id }) => id, logoutAndDelete: async () => ({ logout: "ok" }) }, authorization, hostId: machineIdentity() });
    expect(await service.resolve({ taskId: setup.taskId, agent: "claude", actorId: setup.ownerId })).toBeNull();
    await rows.set({ taskId: setup.taskId, provider: "claude", accountId: personal.id, chosenBy: setup.ownerId, version: 0 });
    await accounts.markRemoved({ id: personal.id, at: new Date("2026-11-25T00:00:00.000Z") });
    await expect(service.resolve({ taskId: setup.taskId, agent: "claude", actorId: setup.ownerId })).rejects.toMatchObject({ reason: "account_removed", message: "A conta Pessoal foi removida. Escolha outra conta para o Claude Code." });
    const replacement = await accounts.insert({ ownerUserId: setup.ownerId, hostId: machineIdentity(), provider: "claude", label: "Trabalho" });
    await rows.set({ taskId: setup.taskId, provider: "claude", accountId: replacement.id, chosenBy: setup.ownerId, version: 1 });
    await expect(service.resolve({ taskId: setup.taskId, agent: "claude", actorId: setup.readerId })).rejects.toMatchObject({ reason: "account_not_owned", message: "A conta escolhida para o Claude Code neste trabalho não é sua. Escolha uma conta sua ou o login padrão." });
    expect(await setup.database.select().from(taskTerminalSessions)).toEqual([]);
  });

  it("V-06e copies the review agent account chosen for each review role", async () => {
    const resolveAccount = async ({ agent }: { taskId: string; agent: "claude" | "codex"; actorId: string }) => agent === "codex" ? "codex-b-id" : null;
    const input = { actorId: "operator", taskId: "task", projectId: "project", requestKey: "request", purpose: "review" as const, reviewCycleId: "cycle", choice: { agent: "codex" as const, model: "gpt-c-1", effort: "high" }, prompt: "review" };
    const captured: Array<string | null | undefined> = [];
    const launch = async (choice: typeof input.choice) => {
      const launcher = new SessionLauncher({
        sessions: { findByRequestKey: async () => null, approvedPlanning: async () => ({ decisionId: "decision", route: "tech_spec", switchedFrom: null, complexity: "medium", reasons: [], uncertainties: [], issue: { number: 42, url: "https://example.test/42", title: "Issue", body: "Body" } }), create: async (session) => { captured.push(session.agentAccountId); return { session: { id: "session", launchFailedAt: null } as never, created: false }; } } as never,
        projects: { findById: async () => ({ repository: { owner: "acme", name: "shop" } } as never) },
        guard: { assertServiceRunning: async () => undefined, assertPrompt: () => undefined, requireCheckout: async () => ({ path: "/repo", branch: "main", detachedSha: null, dirty: false }), assertTools: async () => undefined, assertSkills: async () => undefined } as never,
        delivery: { links: () => NO_ATTACHMENT_LINKS } as never,
        context: {} as never,
        log: {} as never,
        hostId: "host",
        purposes: { confirm: async () => undefined },
        folders: { resolve: async () => ({ path: "/repo", branch: "main", detachedSha: null, dirty: false }) } as never,
        resolveAccount,
      });
      await launcher.launch({ ...input, choice });
    };
    await launch(input.choice);
    await launch({ agent: "claude", model: "opus", effort: "max" });
    expect(captured).toEqual(["codex-b-id", null]);
  });
});
