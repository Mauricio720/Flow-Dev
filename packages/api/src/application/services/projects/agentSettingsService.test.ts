import { describe, expect, it, vi } from "vitest";
import type { AgentSettingsDao, StoredAgentSetting } from "../../database/dao/agentSettingsDao";
import type { ProjectDao } from "../../database/dao/projectDao";
import { ProjectAdminRequiredError } from "../access/projectAccessService";
import { AgentSettingsInvalidError, StaleAgentSettingsError } from "./agentSettingsErrors";
import { AgentSettingsService } from "./agentSettingsService";

const admin = { userId: "admin" };
const member = { userId: "member" };
const PROJECT_ID = "project-1";
const project = { id: PROJECT_ID, externalKey: "p", name: "Alpha", description: null, isDemo: false, createdAt: new Date() };

function stored(overrides: Partial<StoredAgentSetting> = {}): StoredAgentSetting {
  return { projectId: PROJECT_ID, agent: "planning", provider: "codex", model: "gpt-6.1-sol", effort: "medium", version: 1, updatedBy: "admin", updatedAt: new Date(), ...overrides };
}

function build(rows: StoredAgentSetting[] = [], saved: StoredAgentSetting | null = stored()) {
  const dao: AgentSettingsDao = {
    list: vi.fn(async () => rows),
    find: vi.fn(async (_projectId, agent) => rows.find((row) => row.agent === agent) ?? null),
    save: vi.fn(async () => saved),
  };
  const projects = { findVisible: async () => project, list: async () => [project], findByExternalKey: async () => project } as unknown as ProjectDao;
  const permissions = { isAdmin: async (userId: string) => userId === "admin" } as never;
  return { dao, service: new AgentSettingsService(dao, projects, permissions) };
}

describe("agent settings service", () => {
  it("V-07a falls back to Claude sonnet low when the project has no row", async () => {
    const { service } = build();
    expect(await service.resolve(PROJECT_ID, "planning")).toEqual({ choice: { provider: "claude", model: "sonnet", effort: "low" }, available: true });
    const views = await service.view(admin, PROJECT_ID);
    expect(views).toHaveLength(2);
    expect(views.every((view) => view.isDefault && view.version === 0)).toBe(true);
  });

  it("V-07b flags a saved model that left the catalog without throwing", async () => {
    const { service } = build([stored({ provider: "claude", model: "gpt-antigo" })]);
    const resolved = await service.resolve(PROJECT_ID, "planning");
    expect(resolved).toMatchObject({ choice: { model: "gpt-antigo" }, available: false });
    const view = (await service.view(member, PROJECT_ID)).find((item) => item.agent === "planning");
    expect(view).toMatchObject({ modelAvailable: false, isDefault: false });
  });

  it("V-08g rejects a Claude provider with a Codex model before touching the DAO", async () => {
    const { service, dao } = build();
    const update = service.update(admin, { projectId: PROJECT_ID, agent: "planning", provider: "claude", model: "gpt-6.1-sol", effort: "low", expectedVersion: 0 });
    await expect(update).rejects.toBeInstanceOf(AgentSettingsInvalidError);
    expect(dao.save).not.toHaveBeenCalled();
  });

  it("V-08j refuses a member before calling the DAO", async () => {
    const { service, dao } = build();
    const update = service.update(member, { projectId: PROJECT_ID, agent: "planning", provider: "codex", model: "gpt-6.1-sol", effort: "low", expectedVersion: 0 });
    await expect(update).rejects.toBeInstanceOf(ProjectAdminRequiredError);
    expect(dao.save).not.toHaveBeenCalled();
  });

  it("returns the saved view for an admin and records who saved it", async () => {
    const { service, dao } = build();
    const view = await service.update(admin, { projectId: PROJECT_ID, agent: "planning", provider: "codex", model: "gpt-6.1-sol", effort: "medium", expectedVersion: 0 });
    expect(view).toMatchObject({ agent: "planning", provider: "codex", version: 1, isDefault: false, modelAvailable: true });
    expect(dao.save).toHaveBeenCalledWith(expect.objectContaining({ updatedBy: "admin", expectedVersion: 0 }));
  });

  it("turns a DAO conflict into a stale-settings error", async () => {
    const { service } = build([], null);
    const update = service.update(admin, { projectId: PROJECT_ID, agent: "issue_author", provider: "claude", model: "opus", effort: "high", expectedVersion: 3 });
    await expect(update).rejects.toBeInstanceOf(StaleAgentSettingsError);
  });
});
