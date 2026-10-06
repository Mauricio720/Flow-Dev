import { randomBytes } from "node:crypto";
import { vi } from "vitest";
import { testDatabase } from "./database";
import { accounts, adminDesignations, users } from "../src/infra/database/schema";
import { DrizzleProjectDao } from "../src/infra/database/dao/projects/drizzleProjectDao";
import { DrizzleAccessDao } from "../src/infra/database/dao/drizzleAccessDao";
import { DrizzleRepositoryAuthorizationStore } from "../src/infra/database/dao/drizzleRepositoryAuthorizationStore";
import { RepositoryAuthorizationService } from "../src/application/github/repositoryAuthorizationService";
import { TokenCipher } from "../src/application/github/tokenCipher";
import { GitHubHttpRepositoryGateway } from "../src/infra/github/githubRepositoryGateway";
import { ProjectsController } from "../src/controllers/projectsController";
import { createProjectsRouter } from "../src/routers/projects";
import type { RepositoryIdentity } from "../src/application/database/dao/projectDao";

export const repository: RepositoryIdentity = { githubId: "202", nodeId: "R_202", owner: "acme", name: "private", visibility: "private", archived: false };
export async function fixture() {
  const db = await testDatabase();
  const [admin, member] = await db.database.insert(users).values([{ name: "Admin", email: "admin@test.invalid" }, { name: "Member", email: "member@test.invalid" }]).returning();
  await db.database.insert(accounts).values([{ userId: admin.id, providerId: "github", accountId: "77" }, { userId: member.id, providerId: "github", accountId: "88" }]);
  await db.database.insert(adminDesignations).values({ githubUserId: "77", resolvedLogin: "admin" });
  const dao = new DrizzleProjectDao(db.database);
  const permissions = new DrizzleAccessDao(db.database);
  const cipher = new TokenCipher(randomBytes(32).toString("base64url"));
  const store = new DrizzleRepositoryAuthorizationStore(db.database, cipher);
  const oauth = { exchange: vi.fn(async () => ({ accessToken: "oauth_test", scopes: ["repo"] })), profile: vi.fn(async () => ({ id: "77" })), refresh: vi.fn(async () => ({ accessToken: "rotated_access", refreshToken: "rotated_refresh", scopes: ["repo"] })) };
  const authorization = new RepositoryAuthorizationService(store, oauth, cipher);
  const fetcher = vi.fn<typeof fetch>(async (url) => githubResponse(String(url)));
  const github = new GitHubHttpRepositoryGateway(fetcher);
  const controller = new ProjectsController(dao, permissions, { github, authorization });
  const caller = (userId: string) => createProjectsRouter(controller).createCaller({ principal: { userId }, requestId: "integration" });
  const authorize = (userId: string) => store.saveCredential({ userId, githubUserId: userId === admin.id ? "77" : "88", accessToken: "access_test", scopes: ["repo"] });
  const project = (identity = repository, name = "Alpha") => dao.insertVerified({ name, description: null, repository: identity });
  return { ...db, admin, member, dao, permissions, cipher, store, oauth, authorization, fetcher, github, controller, caller, authorize, project };
}

export function githubResponse(url: string, identity = repository) {
  if (url.endsWith("/graphql")) return Response.json({ data: { node: { databaseId: Number(identity.githubId), id: identity.nodeId, name: identity.name, owner: { login: identity.owner }, visibility: identity.visibility.toUpperCase(), isArchived: identity.archived } } });
  const rest = { id: Number(identity.githubId), node_id: identity.nodeId, owner: { login: identity.owner }, name: identity.name, visibility: identity.visibility, archived: identity.archived, default_branch: "main" };
  return Response.json(url.includes("/user/repos") ? [rest] : rest);
}
export type Fixture = Awaited<ReturnType<typeof fixture>>;
