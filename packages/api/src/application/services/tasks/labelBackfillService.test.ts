import { describe, expect, it, vi } from "vitest";
import { RepositoryAuthorizationNeededError } from "../../github/repositoryErrors";
import { ProjectAdminRequiredError } from "../access/projectAccessService";
import { LabelBackfillService } from "./labelBackfillService";

const repository = { githubId: "202", nodeId: "REPO202", owner: "acme", name: "cart", visibility: "private" as const, archived: false };
const project = { id: "project-1", externalKey: "cart", name: "Carrinho", description: null, isDemo: false, createdAt: new Date(), repository };
const draft = { title: "Ajustar o layout da tela do carrinho", context: "Total antigo", objective: "Recalcular", constraints: [], relevantContext: [], productConsiderations: [], references: [] };
const issue = { taskId: "task-1", issueNodeId: "ISSUE41", issueNumber: 41, issueUrl: "https://github.com/acme/cart/issues/41", title: draft.title, canonicalDraft: draft };
const input = { projectId: project.id, userId: "admin-1" };

function setup(options: { admin?: boolean; token?: string | null; issues?: unknown[] } = {}) {
  const github = { label: vi.fn(async () => "labelled" as const), define: vi.fn(async () => "updated" as const) };
  const dependencies = { projects: { findById: async () => project }, permissions: { isAdmin: async () => options.admin ?? true }, issues: { listDraftsByProject: async () => options.issues ?? [issue] }, authorization: { accessToken: async () => (options.token === undefined ? "admin-token" : options.token) }, github };
  return { service: new LabelBackfillService(dependencies as never), github };
}

describe("label backfill", () => {
  it("reports the labels each published Issue would receive without calling GitHub", async () => {
    const { service, github } = setup();
    await expect(service.run({ ...input, apply: false })).resolves.toEqual({ repository: "acme/cart", applied: false, definitions: [], items: [{ issueNumber: 41, issueUrl: issue.issueUrl, title: draft.title, labels: ["frontend"], action: "to_label" }] });
    expect(github.label).not.toHaveBeenCalled();
    expect(github.define).not.toHaveBeenCalled();
  });
  it("labels each published Issue in the project repository when applied", async () => {
    const { service, github } = setup();
    const result = await service.run({ ...input, apply: true });
    expect(github.label).toHaveBeenCalledWith({ owner: "acme", name: "cart", token: "admin-token", issueNumber: 41, labels: ["frontend"] });
    expect(result.items[0]?.action).toBe("labelled");
    expect(github.define).toHaveBeenCalledWith({ owner: "acme", name: "cart", token: "admin-token", label: "frontend", color: "7c4dff", description: "Interface, telas, componentes e estilos", overwrite: true });
    expect(result.definitions).toEqual([{ label: "frontend", action: "updated" }]);
  });
  it("keeps going when one Issue fails and skips drafts it cannot read", async () => {
    const { service, github } = setup({ issues: [issue, { ...issue, issueNumber: 42, canonicalDraft: { title: 7 } }] });
    github.label.mockRejectedValueOnce(new Error("offline"));
    const result = await service.run({ ...input, apply: true });
    expect(result.items.map((item) => item.action)).toEqual(["failed", "unreadable_draft"]);
  });
  it("requires an administrator with a repository authorization", async () => {
    await expect(setup({ admin: false }).service.run({ ...input, apply: true })).rejects.toBeInstanceOf(ProjectAdminRequiredError);
    await expect(setup({ token: null }).service.run({ ...input, apply: true })).rejects.toBeInstanceOf(RepositoryAuthorizationNeededError);
  });
});
