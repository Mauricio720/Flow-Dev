import { DrizzleTaskDao } from "../src/infra/database/dao/tasks/drizzleTaskDao";
import { DrizzleTaskPublicationDao } from "../src/infra/database/dao/tasks/drizzleTaskPublicationDao";
import { DrizzleTaskPublicationWorkerDao } from "../src/infra/database/dao/tasks/drizzleTaskPublicationWorkerDao";
import { DrizzleAccessDao } from "../src/infra/database/dao/drizzleAccessDao";
import { DrizzleProjectDao } from "../src/infra/database/dao/projects/drizzleProjectDao";
import { RepositoryAccessService } from "../src/application/services/projects/repositoryAccessService";
import type { GitHubIssueGateway } from "../src/application/github/issueGateway";
import { TaskError } from "../src/application/services/tasks/taskErrors";
import { TaskPublicationController } from "../src/controllers/taskPublicationController";
import { TaskPublicationWorkerController } from "../src/controllers/taskPublicationWorkerController";
import { createTasksRouter } from "../src/routers/tasks";
import { sessions, taskDraftRevisions, tasks } from "../src/infra/database/schema";
import { fixture } from "./fixture";
import { draft } from "./task-api-support";

type Eligibility = { archived?: boolean; issuesEnabled?: boolean; canRead?: boolean; canCreateIssues?: boolean; repositoryId?: string; publisherGithubId?: string; error?: "provider_rate_limited" };
type Options = { draft?: typeof draft; withoutRevision?: boolean; archived?: boolean; creation?: Awaited<ReturnType<GitHubIssueGateway["create"]>>; eligibility?: Eligibility };

export async function publicationCase(options: Options = {}) {
  const state = await fixture();
  const project = await state.project();
  await state.permissions.assign(state.member.id, project.id, state.admin.id);
  await state.authorize(state.member.id);
  const sessionId = "00000000-0000-4000-8000-000000000091";
  const taskId = "00000000-0000-4000-8000-000000000011";
  const revisionId = "00000000-0000-4000-8000-000000000037";
  await state.database.insert(sessions).values({ id: sessionId, token: "publication-case", userId: state.member.id, expiresAt: new Date(Date.now() + 60_000) });
  await state.database.insert(tasks).values({ id: taskId, projectId: project.id, authorUserId: state.member.id, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 7, title: options.draft?.title ?? draft.title });
  if (!options.withoutRevision) {
    await state.database.insert(taskDraftRevisions).values({ id: revisionId, taskId, revisionNumber: 7, canonicalDraft: options.draft ?? draft, createdByUserId: state.member.id });
    await state.database.update(tasks).set({ currentRevisionId: revisionId }).where(eq(tasks.id, taskId));
  }
  const taskDao = new DrizzleTaskDao(state.database);
  const access = new RepositoryAccessService(new DrizzleProjectDao(state.database), new DrizzleAccessDao(state.database), state.authorization, state.github);
  const gatewayState = gateway(options);
  const github = gatewayState.gateway;
  const publications = new DrizzleTaskPublicationDao(state.database);
  const controller = new TaskPublicationController(taskDao, publications, access, github);
  const caller = (userId = state.member.id) => createTasksRouter(undefined, controller).createCaller({ principal: { userId, sessionId }, requestId: "publication-case" });
  const worker = new TaskPublicationWorkerController(new DrizzleTaskPublicationWorkerDao(state.database), taskDao, access, github, "00000000-0000-4000-8000-000000000081");
  return { state, project, taskId, revisionId, taskDao, caller, worker, github, calls: gatewayState.calls, setArchived: gatewayState.setArchived, close: () => state.close() };
}

function gateway(options: Options) {
  const calls = { create: 0 };
  let archived = options.archived ?? false;
  const gateway = { eligibility: async (input: { repositoryId: string; owner: string; name: string; publisherGithubId: string }) => { if (options.eligibility?.error) throw new TaskError(options.eligibility.error); return { ...input, ...options.eligibility, archived: options.eligibility?.archived ?? archived, issuesEnabled: options.eligibility?.issuesEnabled ?? true, canRead: options.eligibility?.canRead ?? true, canCreateIssues: options.eligibility?.canCreateIssues ?? true }; }, create: async () => { calls.create++; return options.creation ?? { status: "created" as const, receipt: { issueId: "4101", nodeId: "ISSUE41", number: 41, url: "https://github.com/acme/private/issues/41", repositoryId: "202", publisherGithubId: "88", createdAt: "2026-10-01T12:00:00.000Z" } }; }, verify: async () => { throw new Error("unused"); } } as unknown as GitHubIssueGateway;
  return { gateway, calls, setArchived(value: boolean) { archived = value; } };
}
import { eq } from "drizzle-orm";
