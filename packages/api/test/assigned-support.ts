import { sql } from "drizzle-orm";
import { accounts, projectAssignments, users } from "../src/infra/database/schema";
import { RepositoryAccessService } from "../src/application/services/projects/repositoryAccessService";
import { AssignedIssuesController } from "../src/controllers/assignedIssuesController";
import { DrizzleIssueClaimDao } from "../src/infra/database/dao/assigned-issues/drizzleIssueClaimDao";
import { DrizzleIssueSourceDao } from "../src/infra/database/dao/assigned-issues/drizzleIssueSourceDao";
import { createAssignedIssuesServices } from "../src/infra/assignedIssuesComposition";
import { GitHubHttpAssignedIssueGateway } from "../src/infra/github/githubAssignedIssueGateway";
import { createAssignedIssuesRouter } from "../src/routers/assignedIssues";
import { fixture, repository, type Fixture } from "./fixture";
import { BOARD_ID, GitHubWorld } from "./assigned-world";

export const NOW = new Date("2026-10-06T12:00:00.000Z");
export const BOARD = { nodeId: BOARD_ID, url: "https://github.com/orgs/acme/projects/1", title: "Board" };
export const ISSUE_NODE = "I_fixture_41";
export const ITEM_ID = "PVTI_fixture_41";
const SECOND_GITHUB_ID = "99";
let current: Fixture | undefined;
export const clock = { now: NOW };

export async function assignedFixture() {
  const base = await fixture();
  current = base;
  clock.now = NOW;
  const [second] = await base.database.insert(users).values({ name: "Second", email: "second@test.invalid" }).returning();
  await base.database.insert(accounts).values({ userId: second!.id, providerId: "github", accountId: SECOND_GITHUB_ID });
  const project = await base.project(repository);
  await base.dao.updateBoard(project.id, BOARD);
  for (const user of [base.member, second!]) await base.permissions.assign(user.id, project.id, base.admin.id);
  await base.authorize(base.member.id);
  await base.store.saveCredential({ userId: second!.id, githubUserId: SECOND_GITHUB_ID, accessToken: "access_second", scopes: ["repo"] });
  const world = new GitHubWorld();
  world.reset();
  const repositories = new RepositoryAccessService(base.dao, base.permissions, base.authorization, base.github);
  const services = createAssignedIssuesServices(base.database, { gateway: new GitHubHttpAssignedIssueGateway(world.fetcher), repositories, clock: () => clock.now, tokens: async () => "access_test" });
  const controller = new AssignedIssuesController(services);
  const caller = (userId: string) => createAssignedIssuesRouter(controller).createCaller({ principal: { userId }, requestId: "assigned-test" });
  return { ...base, sql, claimsDao: new DrizzleIssueClaimDao(base.database), sourcesDao: new DrizzleIssueSourceDao(base.database), freshController: () => new AssignedIssuesController(createAssignedIssuesServices(base.database, { gateway: new GitHubHttpAssignedIssueGateway(world.fetcher), repositories, clock: () => clock.now, tokens: async () => "access_test" })), u1: base.member, u2: second!, project, world, services, controller, caller, repositories, claimInput: (requestKey = crypto.randomUUID()) => ({ projectId: project.id, issueNodeId: ISSUE_NODE, boardItemId: ITEM_ID, requestKey }) };
}

export type AssignedFixture = Awaited<ReturnType<typeof assignedFixture>>;

export async function resetAssigned(f: AssignedFixture) {
  await f.database.execute(sql`truncate task_issue_claim_attempts, task_issue_claims, task_issue_snapshots, task_issue_sources, task_publication_attempts, task_operations, tasks restart identity cascade`);
  await f.dao.updateBoard(f.project.id, BOARD);
  for (const user of [f.u1, f.u2]) await f.database.insert(projectAssignments).values({ userId: user.id, projectId: f.project.id, createdByUserId: f.admin.id }).onConflictDoNothing();
  await f.authorize(f.u1.id);
  await f.store.saveCredential({ userId: f.u2.id, githubUserId: SECOND_GITHUB_ID, accessToken: "access_second", scopes: ["repo"] });
  f.world.reset();
  clock.now = NOW;
}
export async function closeAssigned() { await current?.close(); current = undefined; }

export const rejection = (promise: Promise<unknown>) => promise.then(() => null, (error: { code: string; cause?: { reason: string; retryAfterSeconds?: number } }) => ({ code: error.code, reason: error.cause?.reason, retryAfterSeconds: error.cause?.retryAfterSeconds }));
