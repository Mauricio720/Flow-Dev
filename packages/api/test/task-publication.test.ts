import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { sessions, taskDraftRevisions, taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import { DrizzleTaskDao } from "../src/infra/database/dao/tasks/drizzleTaskDao";
import { DrizzleTaskPublicationDao } from "../src/infra/database/dao/tasks/drizzleTaskPublicationDao";
import { DrizzleTaskPublicationWorkerDao } from "../src/infra/database/dao/tasks/drizzleTaskPublicationWorkerDao";
import { DrizzleAccessDao } from "../src/infra/database/dao/drizzleAccessDao";
import { DrizzleProjectDao } from "../src/infra/database/dao/projects/drizzleProjectDao";
import { RepositoryAccessService } from "../src/application/services/projects/repositoryAccessService";
import type { GitHubIssueGateway } from "../src/application/github/issueGateway";
import { TaskPublicationController } from "../src/controllers/taskPublicationController";
import { TaskPublicationWorkerController } from "../src/controllers/taskPublicationWorkerController";
import { createTasksRouter } from "../src/routers/tasks";
import { designateAdmin, fixture, type Fixture } from "./fixture";

let current: Fixture | undefined;
afterEach(async () => { await current?.close(); current = undefined; });

describe("task publication lifecycle with PostgreSQL", () => {
  it("UT-031 and IT-011 and IT-012 and IT-191 and IT-213 create once and recover the verified snapshot", async () => {
    current = await fixture();
    await designateAdmin(current, "88", "member");
    const project = await current.project();
    await current.permissions.assign(current.member.id, project.id, current.admin.id);
    await current.authorize(current.member.id);
    const sessionId = "00000000-0000-4000-8000-000000000091";
    await current.database.insert(sessions).values({ id: sessionId, token: "test-session", userId: current.member.id, expiresAt: new Date(Date.now() + 60_000) });
    const taskId = "00000000-0000-4000-8000-000000000011";
    const revisionId = "00000000-0000-4000-8000-000000000037";
    const draft = { title: "Corrigir total", context: "O total permanece antigo", objective: "Recalcular total", constraints: [], relevantContext: [], productConsiderations: [], references: [] };
    await current.database.insert(tasks).values({ id: taskId, projectId: project.id, authorUserId: current.member.id, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 7, title: draft.title });
    await current.database.insert(taskDraftRevisions).values({ id: revisionId, taskId, revisionNumber: 7, canonicalDraft: draft, createdByUserId: current.member.id });
    await current.database.update(tasks).set({ currentRevisionId: revisionId }).where(eq(tasks.id, taskId));
    const taskDao = new DrizzleTaskDao(current.database);
    const repositoryAccess = new RepositoryAccessService(new DrizzleProjectDao(current.database), new DrizzleAccessDao(current.database), current.authorization, current.github);
    const gateway = publicationGateway();
    const publicationDao = new DrizzleTaskPublicationDao(current.database);
    const controller = new TaskPublicationController(taskDao, publicationDao, repositoryAccess, gateway);
    const caller = createTasksRouter(undefined, controller).createCaller({ principal: { userId: current.member.id, sessionId }, requestId: "publication-test" });
    const preview = await caller.preview({ projectId: project.id, taskId, revisionId });
    expect(preview).toMatchObject({ title: draft.title, bodyMarkdown: "## Contexto\n\nO total permanece antigo\n\n## Objetivo\n\nRecalcular total", repositoryId: "202", publisherGithubId: "88" });
    const approved = await caller.publish({ projectId: project.id, taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId, repositoryId: "202", previewHash: preview.previewHash });
    expect(approved).toMatchObject({ taskId, status: "publishing", version: 8 });
    expect(gateway.create).not.toHaveBeenCalled();
    const workerDao = new DrizzleTaskPublicationWorkerDao(current.database);
    const fenceDispatch = vi.spyOn(workerDao, "fenceDispatch");
    const worker = new TaskPublicationWorkerController(workerDao, taskDao, repositoryAccess, gateway, "00000000-0000-4000-8000-000000000081");
    await expect(worker.tick()).resolves.toBe(true);
    expect(gateway.eligibility).toHaveBeenCalled();
    expect(fenceDispatch).toHaveBeenCalled();
    expect(gateway.create).toHaveBeenCalled();
    expect(gateway.create).toHaveBeenCalledWith(expect.objectContaining({ title: preview.title, body: preview.bodyMarkdown }));
    expect(await taskDao.findScoped(project.id, taskId)).toMatchObject({ status: "published", version: 9, activeOperationId: null });
    expect(await taskDao.publication(taskId)).toMatchObject({ issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", title: preview.title, bodyMarkdown: preview.bodyMarkdown });
    expect((await current.database.select().from(taskPublicationAttempts)).map((attempt) => attempt.outcome)).toEqual(["created"]);
    await expect(caller.publish({ projectId: project.id, taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId, repositoryId: "202", previewHash: preview.previewHash })).resolves.toMatchObject({ attemptId: approved.attemptId });
    expect(gateway.create).toHaveBeenCalledTimes(1);
    await expect(caller.reconcilePublication({ projectId: project.id, taskId, requestKey: "00000000-0000-4000-8000-000000000073", expectedVersion: 9, attemptId: approved.attemptId })).resolves.toMatchObject({ status: "published", issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41" });
  });

  it("IT-013/032 keeps uncertainty locked and does not blindly dispatch again", async () => {
    current = await fixture();
    await designateAdmin(current, "88", "member");
    const prepared = await preparePublication(current);
    const gateway = publicationGateway({ status: "uncertain", reason: "delivery_unknown" });
    const worker = new TaskPublicationWorkerController(new DrizzleTaskPublicationWorkerDao(current.database), prepared.taskDao, prepared.repositoryAccess, gateway, "00000000-0000-4000-8000-000000000081");
    await worker.tick();
    expect((await prepared.taskDao.findScoped(prepared.project.id, prepared.taskId))?.status).toBe("publication_uncertain");
    await expect(worker.tick()).resolves.toBe(false);
    expect(gateway.create).toHaveBeenCalledTimes(1);
    await expect(prepared.caller.reconcilePublication({ projectId: prepared.project.id, taskId: prepared.taskId, requestKey: "00000000-0000-4000-8000-000000000072", expectedVersion: 9, attemptId: prepared.attemptId })).resolves.toMatchObject({ status: "publication_uncertain", attemptId: prepared.attemptId, version: 9 });
  });
});

function publicationGateway(outcome: Awaited<ReturnType<GitHubIssueGateway["create"]>> = { status: "created", receipt: { issueId: "4101", nodeId: "ISSUE41", number: 41, url: "https://github.com/acme/private/issues/41", repositoryId: "202", publisherGithubId: "88", createdAt: "2026-10-01T12:00:00.000Z" } }) {
  return { eligibility: vi.fn(async (input: { repositoryId: string; owner: string; name: string; publisherGithubId: string }) => ({ ...input, archived: false, issuesEnabled: true, canRead: true, canCreateIssues: true })), create: vi.fn(async () => outcome), verify: vi.fn() } as unknown as GitHubIssueGateway & { create: ReturnType<typeof vi.fn> };
}

async function preparePublication(f: Fixture) {
  const project = await f.project();
  await f.permissions.assign(f.member.id, project.id, f.admin.id);
  await f.authorize(f.member.id);
  const sessionId = "00000000-0000-4000-8000-000000000091";
  await f.database.insert(sessions).values({ id: sessionId, token: "test-session", userId: f.member.id, expiresAt: new Date(Date.now() + 60_000) });
  const taskId = "00000000-0000-4000-8000-000000000011";
  const revisionId = "00000000-0000-4000-8000-000000000037";
  const draft = { title: "Corrigir total", context: "O total permanece antigo", objective: "Recalcular total", constraints: [], relevantContext: [], productConsiderations: [], references: [] };
  await f.database.insert(tasks).values({ id: taskId, projectId: project.id, authorUserId: f.member.id, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 7, title: draft.title });
  await f.database.insert(taskDraftRevisions).values({ id: revisionId, taskId, revisionNumber: 7, canonicalDraft: draft, createdByUserId: f.member.id });
  await f.database.update(tasks).set({ currentRevisionId: revisionId }).where(eq(tasks.id, taskId));
  const taskDao = new DrizzleTaskDao(f.database);
  const repositoryAccess = new RepositoryAccessService(new DrizzleProjectDao(f.database), new DrizzleAccessDao(f.database), f.authorization, f.github);
  const gateway = publicationGateway();
  const controller = new TaskPublicationController(taskDao, new DrizzleTaskPublicationDao(f.database), repositoryAccess, gateway);
  const caller = createTasksRouter(undefined, controller).createCaller({ principal: { userId: f.member.id, sessionId }, requestId: "publication-test" });
  const preview = await caller.preview({ projectId: project.id, taskId, revisionId });
  const accepted = await caller.publish({ projectId: project.id, taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId, repositoryId: "202", previewHash: preview.previewHash });
  return { project, taskId, taskDao, repositoryAccess, caller, attemptId: accepted.attemptId };
}
