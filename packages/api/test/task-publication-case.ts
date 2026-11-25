import { DrizzleTaskDao } from "../src/infra/database/dao/tasks/drizzleTaskDao";
import { DrizzleTaskPublicationDao } from "../src/infra/database/dao/tasks/drizzleTaskPublicationDao";
import { DrizzleTaskPublicationWorkerDao } from "../src/infra/database/dao/tasks/drizzleTaskPublicationWorkerDao";
import { DrizzleAccessDao } from "../src/infra/database/dao/drizzleAccessDao";
import { DrizzleProjectDao } from "../src/infra/database/dao/projects/drizzleProjectDao";
import { BoardPlacementService } from "../src/application/services/projects/boardPlacementService";
import type { BoardStatus, GitHubProjectBoardGateway } from "../src/application/github/projectBoardGateway";
import { ReadyAssignmentService } from "../src/application/services/tasks/readyAssignmentService";
import { RepositoryRateLimitedError, RepositoryUnavailableError } from "../src/application/github/repositoryErrors";
import { RepositoryAccessService } from "../src/application/services/projects/repositoryAccessService";
import type { GitHubIssueGateway } from "../src/application/github/issueGateway";
import { TaskError } from "../src/application/services/tasks/taskErrors";
import { TaskPublicationController } from "../src/controllers/taskPublicationController";
import { TaskPublicationWorkerController } from "../src/controllers/taskPublicationWorkerController";
import { createTasksRouter } from "../src/routers/tasks";
import { sessions, taskDraftRevisions, tasks } from "../src/infra/database/schema";
import { designateAdmin, fixture } from "./fixture";
import { draft } from "./task-api-support";
import type { IssueImageStore } from "../src/application/github/issueImageStore";
import { IssueImagePublisher } from "../src/application/services/tasks/issueImagePublisher";
import { DrizzleTaskImageDao } from "../src/infra/database/dao/tasks/drizzleTaskImageDao";

type Eligibility = { archived?: boolean; issuesEnabled?: boolean; canRead?: boolean; canCreateIssues?: boolean; canWriteContents?: boolean; repositoryId?: string; publisherGithubId?: string; publisherLogin?: string | null; error?: "provider_rate_limited" };
type Options = { draft?: typeof draft; withoutRevision?: boolean; archived?: boolean; creation?: Awaited<ReturnType<GitHubIssueGateway["create"]>>; eligibility?: Eligibility; imageStore?: IssueImageStore; board?: { statuses: BoardStatus[] | "unreadable" | "rate_limited"; placeFailures?: number } | null };

export async function publicationCase(options: Options = {}) {
  const state = await fixture();
  const project = await state.project();
  await designateAdmin(state, "88", "member");
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
  if (options.board) await state.dao.updateBoard(project.id, { nodeId: "PVT_1", url: "https://github.com/orgs/acme/projects/7", title: "Roadmap" });
  const access = new RepositoryAccessService(new DrizzleProjectDao(state.database), new DrizzleAccessDao(state.database), state.authorization, state.github);
  const gatewayState = gateway(options);
  const boardState = boardGateway(options);
  const boardService = new BoardPlacementService(state.dao, boardState.gateway);
  const readyAssignment = new ReadyAssignmentService(boardService, new DrizzleTaskPublicationWorkerDao(state.database));
  const github = gatewayState.gateway;
  const publications = new DrizzleTaskPublicationDao(state.database);
  const images = options.imageStore ? new IssueImagePublisher(new DrizzleTaskImageDao(state.database), options.imageStore) : undefined;
  const controller = new TaskPublicationController(taskDao, publications, access, github, readyAssignment, images);
  const caller = (userId = state.member.id) => createTasksRouter(undefined, controller).createCaller({ principal: { userId, sessionId }, requestId: "publication-case" });
  const worker = new TaskPublicationWorkerController(new DrizzleTaskPublicationWorkerDao(state.database), taskDao, access, github, "00000000-0000-4000-8000-000000000081", readyAssignment, undefined, images);
  Object.defineProperty(gatewayState.calls, "boardReads", { get: () => boardState.calls.boardReads });
  Object.defineProperty(gatewayState.calls, "boardPlacements", { get: () => boardState.calls.boardPlacements });
  return { state, project, taskId, revisionId, taskDao, caller, worker, github, readyAssignment, calls: gatewayState.calls as typeof gatewayState.calls & { boardReads: number; boardPlacements: number; lastCreate: unknown }, setArchived: gatewayState.setArchived, setBoardStatuses: boardState.setStatuses, setPlaceFailures: boardState.setFailures, setCanWriteContents: gatewayState.setCanWriteContents, close: () => state.close() };
}

function boardGateway(options: Options) {
  const calls = { boardReads: 0, boardPlacements: 0 };
  let statuses = options.board?.statuses ?? [];
  let failures = options.board?.placeFailures ?? 0;
  const gateway = { resolve: async () => ({ nodeId: "PVT_1", url: "https://github.com/orgs/acme/projects/7", title: "Roadmap" }), statuses: async () => { calls.boardReads += 1; if (statuses === "unreadable") throw new RepositoryUnavailableError(); if (statuses === "rate_limited") throw new RepositoryRateLimitedError(60); return statuses; }, place: async () => { calls.boardPlacements += 1; if (failures > 0) { failures -= 1; throw new RepositoryUnavailableError(); } }, issuePresence: async () => "absent" as const } as unknown as GitHubProjectBoardGateway;
  return { gateway, calls, setStatuses(value: BoardStatus[] | "unreadable" | "rate_limited") { statuses = value; }, setFailures(value: number) { failures = value; } };
}

function gateway(options: Options) {
  const calls: { create: number; lastCreate: unknown } = { create: 0, lastCreate: null };
  let archived = options.archived ?? false;
  let canWriteContents = options.eligibility?.canWriteContents ?? true;
  const gateway = { eligibility: async (input: { repositoryId: string; owner: string; name: string; publisherGithubId: string }) => { if (options.eligibility?.error) throw new TaskError(options.eligibility.error); return { ...input, ...options.eligibility, archived: options.eligibility?.archived ?? archived, issuesEnabled: options.eligibility?.issuesEnabled ?? true, canRead: options.eligibility?.canRead ?? true, canCreateIssues: options.eligibility?.canCreateIssues ?? true, canWriteContents, publisherLogin: options.eligibility && "publisherLogin" in options.eligibility ? options.eligibility.publisherLogin : "octo" }; }, create: async (input: unknown) => { calls.create++; calls.lastCreate = input; return options.creation ?? { status: "created" as const, receipt: { issueId: "4101", nodeId: "ISSUE41", number: 41, url: "https://github.com/acme/private/issues/41", repositoryId: "202", publisherGithubId: "88", assigneeGithubIds: [], createdAt: "2026-10-01T12:00:00.000Z" } }; }, verify: async () => { throw new Error("unused"); } } as unknown as GitHubIssueGateway;
  return { gateway, calls, setArchived(value: boolean) { archived = value; }, setCanWriteContents(value: boolean) { canWriteContents = value; } };
}
import { eq } from "drizzle-orm";
