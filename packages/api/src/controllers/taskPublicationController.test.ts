import { describe, expect, it, vi } from "vitest";
import type { TaskDao } from "../application/database/dao/taskDao";
import type { TaskPublicationDao } from "../application/database/dao/taskPublicationDao";
import { TaskError } from "../application/services/tasks/taskErrors";
import { TaskPublicationController } from "./taskPublicationController";

const userId = "00000000-0000-4000-8000-000000000021";
const projectId = "00000000-0000-4000-8000-000000000001";
const taskId = "00000000-0000-4000-8000-000000000011";
const revisionId = "00000000-0000-4000-8000-000000000037";
const repository = { githubId: "202", nodeId: "REPO202", owner: "acme", name: "cart", archived: false, visibility: "private" as const };
const draft = { title: "Corrigir total", context: "O total permanece antigo", objective: "Recalcular total", constraints: [], relevantContext: [], productConsiderations: [], references: [] };

function setup(options: { canCreate?: boolean; replay?: boolean; acceptedReplay?: boolean } = {}) {
  let status = "draft_ready";
  let activeOperationId: string | null = null;
  const task = { id: taskId, projectId, authorUserId: userId, repositoryId: "202", repositoryNodeId: "REPO202", status, version: 7, currentRevisionId: revisionId, activeOperationId, pendingProposalOperationId: null, title: draft.title, lastError: null, createdAt: new Date(), updatedAt: new Date() };
  const tasks = { findScoped: vi.fn(async () => ({ ...task, status, activeOperationId })), findRevision: vi.fn(async () => ({ id: revisionId, canonicalDraft: draft })) };
  const publications = { accepted: vi.fn(async () => options.acceptedReplay ? ({ taskId, attemptId: "attempt-1", operationId: "op-1", version: 8, status: "publishing" as const, created: true }) : null), approve: vi.fn(async (input: { taskId: string }) => { status = "publishing"; activeOperationId = "op-1"; return { taskId: input.taskId, attemptId: "attempt-1", operationId: "op-1", version: 8, status: "publishing" as const, created: !options.replay }; }), fenceDispatch: vi.fn(async () => options.replay ? null : ({ taskId, attemptId: "attempt-1", operationId: "op-1", repositoryId: "202", publisherGithubId: "501", owner: "acme", name: "cart", title: draft.title, bodyMarkdown: "## Contexto\n\nO total permanece antigo\n\n## Objetivo\n\nRecalcular total", outcome: "dispatching" as const, issueNumber: null, receipt: null })), settle: vi.fn(async () => {}), reconciliation: vi.fn() };
  const repositories = { requireRead: vi.fn(async () => repository), contextCredentials: vi.fn(async () => ({ repository, token: "private-token", defaultBranch: "main", publisherGithubId: "501" })) };
  const github = { eligibility: vi.fn(async () => ({ repositoryId: "202", owner: "acme", name: "cart", publisherGithubId: "501", archived: false, issuesEnabled: true, canRead: true, canCreateIssues: options.canCreate !== false })), create: vi.fn(async () => ({ status: "created" as const, receipt: { issueId: "41", nodeId: "ISSUE41", number: 41, url: "https://github.com/acme/cart/issues/41", repositoryId: "202", publisherGithubId: "501", createdAt: "2026-10-01T12:00:00.000Z" } })) };
  return { controller: new TaskPublicationController(tasks as unknown as TaskDao, publications as unknown as TaskPublicationDao, repositories as never, github as never), publications, github };
}

describe("TaskPublicationController", () => {
  it("returns the repository and publisher identities the web client renders in the preview", async () => {
    const { controller } = setup();
    const preview = await controller.preview({ userId, sessionId: "session-1" }, { projectId, taskId, revisionId });
    expect(preview).toMatchObject({ repository: { id: "202", owner: "acme", name: "cart" }, publisher: { githubId: "501", login: null } });
  });

  it("UT-029 persists an approved snapshot and returns before external creation", async () => {
    const { controller, github, publications } = setup();
    const actor = { userId, sessionId: "session-1" };
    const preview = await controller.preview(actor, { projectId, taskId, revisionId });
    const result = await controller.publish(actor, { projectId, taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId, repositoryId: "202", previewHash: preview.previewHash });
    expect(github.create).not.toHaveBeenCalled();
    expect(publications.settle).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "publishing", attemptId: "attempt-1" });
  });

  it("UT-030 rejects approval for a stale revision before creating a durable attempt", async () => {
    const { controller, publications, github } = setup();
    const actor = { userId, sessionId: "session-1" };
    const preview = await controller.preview(actor, { projectId, taskId, revisionId });
    await expect(controller.publish(actor, { projectId, taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 6, revisionId, repositoryId: "202", previewHash: preview.previewHash })).rejects.toThrowError(new TaskError("revision_conflict"));
    expect(publications.approve).not.toHaveBeenCalled();
    expect(github.create).not.toHaveBeenCalled();
  });

  it("rejects a repository identity without Issue creation permission", async () => {
    const { controller, github } = setup({ canCreate: false });
    await expect(controller.preview({ userId, sessionId: "s1" }, { projectId, taskId, revisionId })).rejects.toThrowError(new TaskError("issue_permission_denied"));
    expect(github.create).not.toHaveBeenCalled();
  });

  it("does not dispatch again when an accepted request is replayed", async () => {
    const { controller, github } = setup({ replay: true });
    const actor = { userId, sessionId: "session-1" };
    const preview = await controller.preview(actor, { projectId, taskId, revisionId });
    await controller.publish(actor, { projectId, taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId, repositoryId: "202", previewHash: preview.previewHash });
    expect(github.create).not.toHaveBeenCalled();
  });

  it("returns a previously accepted request without refreshing publication eligibility", async () => {
    const { controller, publications, github } = setup({ acceptedReplay: true });
    const result = await controller.publish({ userId, sessionId: "session-1" }, { projectId, taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId, repositoryId: "202", previewHash: "a".repeat(64) });
    expect(result).toMatchObject({ attemptId: "attempt-1", status: "publishing" });
    expect(publications.approve).not.toHaveBeenCalled();
    expect(github.eligibility).not.toHaveBeenCalled();
  });
});
