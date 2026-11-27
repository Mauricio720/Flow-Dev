import { afterEach, describe, expect, it } from "vitest";
import { AssignedIssueError } from "../src/application/services/assigned-issues/assignedIssueErrors";
import type { WorkAuthorization } from "../src/application/services/assigned-issues/workAuthorization";
import type { AgentAccountHome } from "../src/application/agent-accounts/agentAccountHome";
import { AgentAccountService } from "../src/application/services/agent-accounts/agentAccountService";
import { WorkAccountService } from "../src/application/services/agent-accounts/workAccountService";
import { DrizzleAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleAgentAccountDao";
import { DrizzleTaskAgentAccountDao } from "../src/infra/database/dao/agent-accounts/drizzleTaskAgentAccountDao";
import { closeTaskFixture } from "./task-api-support";
import { world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

async function accountServices() {
  const { setup } = await world();
  const accounts = new DrizzleAgentAccountDao(setup.database);
  const choices = new DrizzleTaskAgentAccountDao(setup.database);
  const home: AgentAccountHome = { pathOf: ({ id }) => `/state/${id}`, ensure: async ({ id }) => `/state/${id}`, logoutAndDelete: async () => ({ logout: "ok" }) };
  const authorization = { requireOperate: async ({ actorId }: { projectId: string; taskId: string; actorId: string }) => { if (actorId !== setup.ownerId) throw new AssignedIssueError("operator_required"); } } as unknown as Pick<WorkAuthorization, "requireOperate">;
  const works = new WorkAccountService({ choices, accounts, home, authorization, hostId: "host-h" });
  const personal = new AgentAccountService({ accounts, home, inspector: { inspect: async () => ({ status: "logged_out" as const, identity: null, plan: null, detail: null }) }, hostId: "host-h", log: () => undefined });
  return { setup, accounts, choices, works, personal };
}

describe("WorkAccountService get and set", () => {
  it("V-05a and V-05e return defaults, save a selection and clear back to default", async () => {
    const { setup, works, personal } = await accountServices();
    expect(await works.get(setup.ownerId, setup.taskId)).toMatchObject({ choices: [{ provider: "claude", accountId: null, label: "Login padrão desta máquina", status: "default" }, { provider: "codex", accountId: null, label: "Login padrão desta máquina", status: "default" }], version: 0 });
    const account = await personal.create(setup.ownerId, { provider: "claude", label: "Trabalho" });
    await works.set(setup.ownerId, { taskId: setup.taskId, provider: "claude", accountId: account.id, version: 0 });
    expect(await works.get(setup.ownerId, setup.taskId)).toMatchObject({ choices: [{ provider: "claude", accountId: account.id, label: "Trabalho", status: "pending_login" }, { provider: "codex", accountId: null, status: "default" }], version: 1 });
    await works.set(setup.ownerId, { taskId: setup.taskId, provider: "claude", accountId: null, version: 1 });
    expect(await works.get(setup.ownerId, setup.taskId)).toMatchObject({ choices: [{ accountId: null, status: "default" }, { accountId: null, status: "default" }] });
  });

  it("V-05b requires the operator and leaves choices unchanged", async () => {
    const { setup, works } = await accountServices();
    await expect(works.set(setup.readerId, { taskId: setup.taskId, provider: "claude", accountId: null, version: 0 })).rejects.toMatchObject({ reason: "operator_required" });
    expect((await works.get(setup.ownerId, setup.taskId)).version).toBe(0);
  });

  it("V-05c refuses another person's account and a removed account", async () => {
    const { setup, accounts, choices, works, personal } = await accountServices();
    const another = await personal.create(setup.readerId, { provider: "codex", label: "Privada" });
    await expect(works.set(setup.ownerId, { taskId: setup.taskId, provider: "codex", accountId: another.id, version: 0 })).rejects.toMatchObject({ reason: "not_found" });
    const own = await personal.create(setup.ownerId, { provider: "codex", label: "Antiga" });
    await accounts.markRemoved({ id: own.id, at: new Date("2026-11-25T00:00:00.000Z") });
    await expect(works.set(setup.ownerId, { taskId: setup.taskId, provider: "codex", accountId: own.id, version: 0 })).rejects.toMatchObject({ reason: "not_found" });
    expect(await choices.choicesOf(setup.taskId)).toEqual([]);
  });

  it("V-05d rejects the second write that uses the same version", async () => {
    const { setup, works, personal } = await accountServices();
    const account = await personal.create(setup.ownerId, { provider: "codex", label: "Codex B" });
    const first = await works.set(setup.ownerId, { taskId: setup.taskId, provider: "codex", accountId: account.id, version: 0 });
    expect(first.accountId).toBe(account.id);
    await expect(works.set(setup.ownerId, { taskId: setup.taskId, provider: "codex", accountId: null, version: 0 })).rejects.toMatchObject({ reason: "stale", message: "A escolha mudou; recarregue" });
  });

  it("V-05h returns only active accounts for the owner", async () => {
    const { setup, works, accounts, personal } = await accountServices();
    const claude = await personal.create(setup.ownerId, { provider: "claude", label: "Pessoal" });
    const codex = await personal.create(setup.ownerId, { provider: "codex", label: "Codex B" });
    const removed = await personal.create(setup.ownerId, { provider: "claude", label: "Antiga" });
    await accounts.markRemoved({ id: removed.id, at: new Date("2026-11-25T00:00:00.000Z") });
    expect(await works.get(setup.ownerId, setup.taskId)).toMatchObject({ options: { claude: [{ id: claude.id }], codex: [{ id: codex.id }] } });
  });
});
