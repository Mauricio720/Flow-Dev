import type { SessionPrincipal } from "../../../context";
import type { AccessDao } from "../../database/dao/accessDao";
import type { ProjectDao } from "../../database/dao/projectDao";
import type { RepositoryAuthorizationService } from "../../github/repositoryAuthorizationService";
import type { GitHubRepositoryGateway } from "../../github/repositoryGateway";
import { CredentialUnavailableError, RepositoryIdentityMismatchError, RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryNotFoundError, RepositoryRateLimitedError, RepositoryUnavailableError } from "../../github/repositoryErrors";
import { resolveProjectRepository } from "./resolveProjectRepository";
import { ProjectAccessService } from "../access/projectAccessService";

export type ConnectionState = { projectId: string; kind: "available" | "authorization_needed" | "access_denied_or_missing" | "temporarily_unavailable" | "archived"; checkedAt?: string; reason?: string; retryAfterSeconds?: number };
export class ConnectionStateService {
  private readonly access: ProjectAccessService;
  constructor(private readonly projects: ProjectDao, permissions: AccessDao, private readonly authorization: RepositoryAuthorizationService, private readonly github: GitHubRepositoryGateway) { this.access = new ProjectAccessService(projects, permissions); }
  async forVisibleProjects(actor: SessionPrincipal, ids: string[]): Promise<ConnectionState[]> {
    if (ids.length < 1 || ids.length > 50) throw new Error("At most 50 projects can be checked");
    return Promise.all(ids.map((projectId) => this.check(actor, projectId)));
  }
  private async check(actor: SessionPrincipal, projectId: string): Promise<ConnectionState> {
    const project = await this.access.requireProject(actor, projectId);
    if (!project.repository) return { projectId, kind: "access_denied_or_missing" };
    let current;
    try {
      current = (await resolveProjectRepository({ userId: actor.userId, repository: project.repository, authorization: this.authorization, github: this.github })).repository;
    } catch (error) { return { projectId, ...stateFor(error) }; }
    await this.projects.updateRepositoryLabel?.(current);
    return { projectId, kind: current.archived ? "archived" : "available", checkedAt: new Date().toISOString() };
  }
}

function stateFor(error: unknown): Omit<ConnectionState, "projectId"> {
  if (error instanceof RepositoryAuthorizationNeededError || error instanceof RepositoryForbiddenError || error instanceof CredentialUnavailableError) return { kind: "authorization_needed" };
  if (error instanceof RepositoryIdentityMismatchError) return { kind: "access_denied_or_missing", reason: "identity_mismatch" };
  if (error instanceof RepositoryNotFoundError) return { kind: "access_denied_or_missing" };
  if (error instanceof RepositoryRateLimitedError) return { kind: "temporarily_unavailable", retryAfterSeconds: error.retryAfterSeconds };
  if (error instanceof RepositoryUnavailableError) return { kind: "temporarily_unavailable" };
  throw error;
}
