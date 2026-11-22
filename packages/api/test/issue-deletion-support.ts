import { and, eq, inArray, sql } from "drizzle-orm";
import { accounts, taskDraftRevisions, taskExecutionActions, taskExecutionPlans, taskExecutionRuns, taskIssueSnapshots, taskIssueSources, taskMessages, taskOperations, taskPublicationAttempts, tasks, users } from "../src/infra/database/schema";
import { DrizzleIssueDeletionDao } from "../src/infra/database/dao/issue-deletion/drizzleIssueDeletionDao";
import { RepositoryAccessService } from "../src/application/services/projects/repositoryAccessService";
import { ProjectAccessService } from "../src/application/services/access/projectAccessService";
import { RepositoryDeletionAccess } from "../src/application/services/issue-deletion/repositoryDeletionAccess";
import { CoordinatedDeletionStop } from "../src/application/services/issue-deletion/coordinatedDeletionStop";
import { IssueDeletionService } from "../src/application/services/issue-deletion/issueDeletionService";
import { IssueDeletionWorker } from "../src/application/services/issue-deletion/issueDeletionWorker";
import { GitHubDeletionProvider } from "../src/infra/issue-deletion/gitHubDeletionProvider";
import { GitHubHttpIssueDeletionGateway } from "../src/infra/github/githubIssueDeletionGateway";
import { IssueDeletionController } from "../src/controllers/issueDeletionController";
import { createIssueDeletionRouter } from "../src/routers/issueDeletion";
import { fixture, repository, type Fixture } from "./fixture";
import { DeletionWorld } from "./issue-deletion-world";
import { removeTerminalDeletionState, terminalDeletionState } from "./issue-deletion-terminal-support";

export const SESSION = "60000000-0000-4000-8000-000000000001";
export const NOW = new Date("2026-10-13T12:00:00.000Z");

let current: Fixture | undefined;

export async function issueDeletionFixture() {
  const base = await fixture();
  current = base;
  const [second] = await base.database.insert(users).values({ name: "Second", email: "second@test.invalid" }).returning();
  await base.database.insert(accounts).values({ userId: second!.id, providerId: "github", accountId: "99" });
  const project = await base.project(repository, "Alpha");
  await base.permissions.assign(base.member.id, project.id, base.admin.id);
  await base.permissions.assign(second!.id, project.id, base.admin.id);
  await base.authorize(base.member.id);
  await base.authorize(base.admin.id);
  await base.store.saveCredential({ userId: second!.id, githubUserId: "99", accessToken: "access_second", scopes: ["repo"] });
  const world = new DeletionWorld();
  world.reset();
  const dao = new DrizzleIssueDeletionDao(base.database);
  const access = new RepositoryDeletionAccess(new ProjectAccessService(base.dao, base.permissions), base.permissions, base.authorization, new RepositoryAccessService(base.dao, base.permissions, base.authorization, base.github));
  const provider = new GitHubDeletionProvider(new GitHubHttpIssueDeletionGateway(world.fetcher), base.authorization);
  const clock = { now: NOW };
  const stop = new CoordinatedDeletionStop({ dao });
  const service = new IssueDeletionService({ dao, access, provider, clock: () => clock.now });
  const { terminalEnv, terminalFiles } = await terminalDeletionState(base.database);
  const worker = new IssueDeletionWorker({ dao, access, provider, stop, owner: "test-worker", clock: () => clock.now, leaseMs: 60_000, terminalFiles });
  const controller = new IssueDeletionController(service);
  const caller = (userId: string, sessionId: string | null = SESSION) => createIssueDeletionRouter(controller).createCaller({ principal: sessionId ? { userId, sessionId } : null, requestId: "issue-deletion-test" });
  const drain = async (limit = 30) => { for (let index = 0; index < limit; index += 1) { if (!(await worker.tick())) break; } };
  return { ...base, terminalEnv, createProject: base.project, second: second!, project, world, dao, provider, clock, worker, caller, drain, stop };
}

export type IssueDeletionFixture = Awaited<ReturnType<typeof issueDeletionFixture>>;

export async function resetIssueDeletion(f: IssueDeletionFixture) {
  await f.database.execute(sql`truncate issue_deletion_operations`);
  f.world.reset();
  f.clock.now = NOW;
}

export async function closeIssueDeletion() { await current?.close(); current = undefined; await removeTerminalDeletionState(); }

export function rejection(promise: Promise<unknown>) {
  return promise.then(() => null, (error: { code: string; cause?: { reason: string; retryAfterSeconds?: number } }) => ({ code: error.code, reason: error.cause?.reason, retryAfterSeconds: error.cause?.retryAfterSeconds }));
}

export async function seedTask(database: Fixture["database"], input: { projectId: string; authorUserId: string | null; title?: string; status?: string; origin?: string; messages?: number; issueNodeId?: string | null; issueNumber?: number | null; publicationOutcome?: string | null }) {
  const taskId = crypto.randomUUID();
  await database.insert(tasks).values({ id: taskId, projectId: input.projectId, authorUserId: input.authorUserId, repositoryId: "202", repositoryNodeId: "R_202", origin: input.origin, status: input.status ?? "draft_ready", title: input.title ?? "Draft title" });
  for (let index = 1; index <= (input.messages ?? 1); index += 1) {
    await database.insert(taskMessages).values({ id: crypto.randomUUID(), taskId, sequence: index, role: index === 1 ? "user" : "assistant", kind: index === 1 ? "intent" : "result", content: `Message ${index}` });
  }
  if (input.publicationOutcome) {
    const operationId = crypto.randomUUID();
    const attemptId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    await database.insert(taskDraftRevisions).values({ id: revisionId, taskId, revisionNumber: 1, parentRevisionId: null, operationId: null, canonicalDraft: { title: input.title ?? "Draft title", body: "Body" }, evidenceBindings: [], manuallyEditedPaths: [], createdByUserId: input.authorUserId });
    await database.update(tasks).set({ currentRevisionId: revisionId }).where(eq(tasks.id, taskId));
    await database.insert(taskOperations).values({ id: operationId, taskId, kind: "publish", state: input.publicationOutcome === "created" ? "succeeded" : "failed", initiatedSessionId: SESSION, baseTaskVersion: 1, lastError: null });
    await database.insert(taskPublicationAttempts).values({ id: attemptId, taskId, operationId, revisionId, publisherUserId: input.authorUserId, publisherGithubId: "88", repositoryId: "202", repositoryNodeId: "R_202", approvedOwner: "acme", approvedName: "private", previewHash: "a".repeat(64), titleSnapshot: input.title ?? "Draft title", bodySnapshot: "Body", approvalSessionId: SESSION, outcome: input.publicationOutcome, issueId: input.issueNodeId ? taskId : null, issueNodeId: input.issueNodeId ?? null, issueNumber: input.issueNumber ?? null, issueUrl: input.issueNodeId ? "https://github.com/acme/private/issues/41" : null });
    if (input.issueNodeId && input.publicationOutcome === "created") {
      const sourceId = crypto.randomUUID();
      await database.insert(taskIssueSources).values({ id: sourceId, taskId, projectId: input.projectId, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: input.issueNodeId, issueNumber: input.issueNumber ?? 41, issueUrl: "https://github.com/acme/private/issues/41", origin: "flow_dev", publicationAttemptId: attemptId });
      await database.insert(taskIssueSnapshots).values({ id: crypto.randomUUID(), sourceId, taskId, revision: 1, title: input.title ?? "Draft title", bodyMarkdown: "Body", githubUpdatedAt: new Date(), contentHash: "hash", verifiedAt: new Date(), verifiedByUserId: null, origin: "flow_dev", publicationAttemptId: attemptId });
    }
  }
  return taskId;
}

export async function seedRun(database: Fixture["database"], input: { taskId: string; requestedBy: string; state?: string; worktreeId?: string | null }) {
  let plan = (await database.select({ id: taskExecutionPlans.id }).from(taskExecutionPlans).where(eq(taskExecutionPlans.taskId, input.taskId)).limit(1))[0];
  if (!plan) {
    const planId = crypto.randomUUID();
    await database.insert(taskExecutionPlans).values({ id: planId, taskId: input.taskId, kind: "os_unified", revision: 1, status: "planned", createdBy: input.requestedBy });
    plan = { id: planId };
  }
  const [lastAction] = await database.select({ position: taskExecutionActions.position }).from(taskExecutionActions).where(eq(taskExecutionActions.taskId, input.taskId)).orderBy(sql`${taskExecutionActions.position} desc`).limit(1);
  const position = (lastAction?.position ?? 0) + 1;
  const actionId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  await database.insert(taskExecutionActions).values({ id: actionId, planId: plan.id, taskId: input.taskId, position, kind: "create_spec", inputs: {}, workspaceKind: input.worktreeId ? "existing" : "isolated", worktreeId: input.worktreeId ?? null, worktreeName: null, state: "planned" });
  await database.insert(taskExecutionRuns).values({ id: runId, actionId, taskId: input.taskId, attemptNumber: 1, state: input.state ?? "succeeded", snapshot: { kind: "create_spec" }, worktreeId: input.worktreeId ?? null, connectionIds: [], isWrite: true, leaseOwner: null, leaseFence: 0, leaseExpiresAt: null, idempotencyKey: crypto.randomUUID(), requestedBy: input.requestedBy, terminalCode: input.state === "succeeded" ? null : "runtime_failed", finishedAt: input.state === "succeeded" ? new Date() : null });
  return runId;
}

export async function seedDraftRevision(database: Fixture["database"], input: { taskId: string; authorUserId: string; revisionNumber?: number }) {
  await database.insert(taskDraftRevisions).values({ id: crypto.randomUUID(), taskId: input.taskId, revisionNumber: input.revisionNumber ?? 1, parentRevisionId: null, operationId: null, canonicalDraft: { title: "Draft" }, evidenceBindings: [], manuallyEditedPaths: [], createdByUserId: input.authorUserId });
}
