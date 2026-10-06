import { describe, expect, it, vi } from "vitest";
import type { TaskDao } from "../application/database/dao/taskDao";
import type { TaskPublicationWorkerDao, PublicationWorkerClaim } from "../application/database/dao/taskPublicationWorkerDao";
import { previewHash } from "../application/services/tasks/draftRules";
import { TaskPublicationWorkerController } from "./taskPublicationWorkerController";

const userId = "00000000-0000-4000-8000-000000000021";
const taskId = "00000000-0000-4000-8000-000000000011";
const projectId = "00000000-0000-4000-8000-000000000001";
const revisionId = "00000000-0000-4000-8000-000000000037";
const bodyMarkdown = "## Contexto\n\nO total permanece antigo\n\n## Objetivo\n\nRecalcular total";
const draft = { title: "Corrigir total", context: "O total permanece antigo", objective: "Recalcular total", constraints: [], relevantContext: [], productConsiderations: [], references: [] };
const claim: PublicationWorkerClaim = { taskId, attemptId: "attempt-1", operationId: "op-1", projectId, sessionId: "session-1", publisherUserId: userId, publisherGithubId: "501", repositoryId: "202", repositoryNodeId: "REPO202", owner: "acme", name: "cart", revisionId, previewHash: previewHash({ revisionId, title: draft.title, body: bodyMarkdown, repositoryId: "202", owner: "acme", name: "cart", publisherGithubId: "501", labels: ["generica"] }), title: draft.title, bodyMarkdown, workerId: "worker-1" };

function setup(activeSession = true, repoName = "cart", priorityPoints: number | null = null) {
  const dao = { claim: vi.fn(async () => claim), sessionActive: vi.fn(async () => activeSession), fenceDispatch: vi.fn(async () => true), settle: vi.fn(async () => {}) };
  const tasks = { findScoped: vi.fn(async () => ({ id: taskId, projectId, authorUserId: userId, repositoryId: "202", repositoryNodeId: "REPO202", status: "publishing", version: 8, currentRevisionId: revisionId, activeOperationId: "op-1", pendingProposalOperationId: null, title: draft.title, lastError: null, createdAt: new Date(), updatedAt: new Date() })), findRevision: vi.fn(async () => ({ id: revisionId, canonicalDraft: { ...draft, priorityPoints } })) };
  const repository = { githubId: "202", nodeId: "REPO202", owner: "acme", name: repoName, archived: false, visibility: "private" as const };
  const repositories = { contextCredentials: vi.fn(async () => ({ repository, token: "private-token", publisherGithubId: "501", defaultBranch: "main" })) };
  const github = { eligibility: vi.fn(async () => ({ repositoryId: "202", owner: "acme", name: repoName, publisherGithubId: "501", archived: false, issuesEnabled: true, canRead: true, canCreateIssues: true })), create: vi.fn(async () => ({ status: "created" as const, receipt: { issueId: "41", nodeId: "ISSUE41", number: 41, url: "https://github.com/acme/cart/issues/41", repositoryId: "202", publisherGithubId: "501", createdAt: "2026-10-01T12:00:00.000Z" } })) };
  const backlog = { place: vi.fn(async () => "placed" as const) };
  const labels = { define: vi.fn(async (): Promise<"created"> => "created"), label: vi.fn() };
  return { worker: new TaskPublicationWorkerController(dao as unknown as TaskPublicationWorkerDao, tasks as unknown as TaskDao, repositories as never, github as never, "00000000-0000-4000-8000-000000000081", backlog as never, labels), dao, github, backlog, labels };
}

describe("TaskPublicationWorkerController", () => {
  it("defines the task labels in the repository before creating the Issue and never recolors them", async () => {
    const { worker, github, labels } = setup();
    await worker.tick();
    expect(labels.define).toHaveBeenCalledWith(expect.objectContaining({ owner: "acme", name: "cart", token: "private-token", label: "generica", overwrite: false }));
    expect(github.create).toHaveBeenCalledTimes(1);
  });
  it("still creates the Issue when the label definitions fail", async () => {
    const { worker, github, labels } = setup();
    labels.define.mockRejectedValue(new Error("offline"));
    await worker.tick();
    expect(github.create).toHaveBeenCalledTimes(1);
  });
  it("revalidates the immutable preview and sends only the approved title and body", async () => {
    const { worker, dao, github } = setup();
    await expect(worker.tick()).resolves.toBe(true);
    expect(github.create).toHaveBeenCalledWith(expect.objectContaining({ title: claim.title, body: claim.bodyMarkdown, labels: ["generica"], token: "private-token" }));
    expect(dao.fenceDispatch).toHaveBeenCalledWith(claim);
    expect(dao.settle).toHaveBeenCalledWith(claim, expect.objectContaining({ status: "created" }), true);
  });

  it("places the created issue in the project backlog and keeps the publication when placement fails", async () => {
    const { worker, dao, backlog } = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    backlog.place.mockRejectedValueOnce(new Error("board unavailable"));
    await expect(worker.tick()).resolves.toBe(true);
    expect(backlog.place).toHaveBeenCalledWith({ projectId, token: "private-token", issueNodeId: "ISSUE41", priorityPoints: null });
    expect(dao.settle).toHaveBeenCalledTimes(1);
    expect(dao.settle).toHaveBeenCalledWith(claim, expect.objectContaining({ status: "created" }), true);
  });

  it("sends the priority points of the approved draft to the backlog placement", async () => {
    const { worker, backlog } = setup(true, "cart", 4);
    await expect(worker.tick()).resolves.toBe(true);
    expect(backlog.place).toHaveBeenCalledWith({ projectId, token: "private-token", issueNodeId: "ISSUE41", priorityPoints: 4 });
  });

  it("refuses dispatch when the originating session is no longer active", async () => {
    const { worker, dao, github } = setup(false);
    await worker.tick();
    expect(dao.fenceDispatch).not.toHaveBeenCalled();
    expect(github.create).not.toHaveBeenCalled();
    expect(dao.settle).toHaveBeenCalledWith(claim, { status: "rejected", reason: "access_revoked" }, false);
  });

  it("requires fresh review when the repository destination has changed", async () => {
    const { worker, dao, github } = setup(true, "renamed-cart");
    await worker.tick();
    expect(dao.fenceDispatch).not.toHaveBeenCalled();
    expect(github.create).not.toHaveBeenCalled();
    expect(dao.settle).toHaveBeenCalledWith(claim, { status: "rejected", reason: "preview_changed" }, false);
  });
});
