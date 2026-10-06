import { eq } from "drizzle-orm";
import { sessions, taskDraftRevisions, taskMessages, taskOperations, taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import { DrizzleTaskDao } from "../src/infra/database/dao/tasks/drizzleTaskDao";
import { DrizzleAccessDao } from "../src/infra/database/dao/drizzleAccessDao";
import { DrizzleProjectDao } from "../src/infra/database/dao/projects/drizzleProjectDao";
import { RepositoryAccessService } from "../src/application/services/projects/repositoryAccessService";
import { TasksController } from "../src/controllers/tasksController";
import { createTasksRouter } from "../src/routers/tasks";
import { fixture, type Fixture } from "./fixture";

export const storedDraftDefaults = { priorityPoints: null, labels: ["generica"] };
export const draft = { title: "Corrigir total", context: "O total permanece antigo", objective: "Recalcular total", constraints: [], relevantContext: [], productConsiderations: [], references: [] };
let current: Fixture | undefined;

export async function taskFixture() {
  current = await fixture();
  const project = await current.project();
  await current.permissions.assign(current.member.id, project.id, current.admin.id);
  await current.authorize(current.member.id);
  const sessionId = "00000000-0000-4000-8000-000000000091";
  await current.database.insert(sessions).values({ id: sessionId, token: "task-test", userId: current.member.id, expiresAt: new Date(Date.now() + 60_000) });
  const taskDao = new DrizzleTaskDao(current.database);
  const repositoryAccess = new RepositoryAccessService(new DrizzleProjectDao(current.database), new DrizzleAccessDao(current.database), current.authorization, current.github);
  const callerFor = (userId: string) => createTasksRouter(new TasksController(taskDao, repositoryAccess)).createCaller({ principal: { userId, sessionId }, requestId: "task-api-test" });
  return { database: current.database, project, createProject: current.project, githubFetcher: current.fetcher, ownerId: current.member.id, readerId: current.admin.id, sessionId, taskDao, repositoryAccess, permissions: current.permissions, authorize: current.authorize, caller: callerFor(current.member.id), callerFor, taskId: "00000000-0000-4000-8000-000000000011", revisionId: "00000000-0000-4000-8000-000000000037", previousRevisionId: "00000000-0000-4000-8000-000000000036", proposalId: "00000000-0000-4000-8000-000000000063" };
}

export async function closeTaskFixture() { await current?.close(); current = undefined; }

export async function seedTask(setup: Awaited<ReturnType<typeof taskFixture>>, options: { messages?: boolean; previousRevision?: boolean; proposal?: boolean; canonicalDraft?: unknown } = {}) {
  await setup.database.insert(tasks).values({ id: setup.taskId, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 7, title: draft.title });
  if (options.previousRevision) await setup.database.insert(taskDraftRevisions).values({ id: setup.previousRevisionId, taskId: setup.taskId, revisionNumber: 6, canonicalDraft: draft, createdByUserId: setup.ownerId });
  await setup.database.insert(taskDraftRevisions).values({ id: setup.revisionId, taskId: setup.taskId, revisionNumber: 7, parentRevisionId: options.previousRevision ? setup.previousRevisionId : null, canonicalDraft: options.canonicalDraft ?? draft, createdByUserId: setup.ownerId });
  await setup.database.update(tasks).set({ currentRevisionId: setup.revisionId }).where(eq(tasks.id, setup.taskId));
  if (options.messages) await setup.database.insert(taskMessages).values([{ taskId: setup.taskId, sequence: 1, role: "user", kind: "intent", content: "Corrigir total do carrinho" }, { taskId: setup.taskId, sequence: 2, role: "assistant", kind: "clarification", content: "Qual regra fiscal devo preservar?" }]);
  if (options.proposal) await seedProposal(setup);
}

async function seedProposal(setup: Awaited<ReturnType<typeof taskFixture>>) {
  await setup.database.insert(taskOperations).values({ id: setup.proposalId, taskId: setup.taskId, kind: "generate", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: 7, baseRevisionId: setup.revisionId, result: { ...draft, title: "Título proposto" }, proposalResolution: "pending" });
  await setup.database.insert(taskDraftRevisions).values({ taskId: setup.taskId, revisionNumber: 8, parentRevisionId: setup.revisionId, operationId: setup.proposalId, canonicalDraft: { ...draft, title: "Título proposto" }, createdByUserId: setup.ownerId });
  await setup.database.update(tasks).set({ pendingProposalOperationId: setup.proposalId }).where(eq(tasks.id, setup.taskId));
}

export async function seedPublishedIssue(setup: Awaited<ReturnType<typeof taskFixture>>, issueUrl = "https://github.com/acme/private/issues/41") {
  const operationId = "00000000-0000-4000-8000-000000000071";
  const createdAt = new Date("2026-10-01T12:00:00.000Z");
  await setup.database.insert(taskOperations).values({ id: operationId, taskId: setup.taskId, kind: "publish", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: 8, baseRevisionId: setup.revisionId });
  await setup.database.insert(taskPublicationAttempts).values({ taskId: setup.taskId, operationId, revisionId: setup.revisionId, publisherUserId: setup.ownerId, publisherGithubId: "88", repositoryId: "202", repositoryNodeId: "R_202", approvedOwner: "acme", approvedName: "private", previewHash: "a".repeat(64), titleSnapshot: draft.title, bodySnapshot: "## Contexto\n\nO total permanece antigo", approvalSessionId: setup.sessionId, outcome: "created", issueId: "4101", issueNodeId: "ISSUE41", issueNumber: 41, issueUrl, issueCreatedAt: createdAt, verifiedReceipt: { issueId: "4101", number: 41, url: issueUrl } });
  await setup.database.update(tasks).set({ status: "published", version: 9, activeOperationId: null }).where(eq(tasks.id, setup.taskId));
}
