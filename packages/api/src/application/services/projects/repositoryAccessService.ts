import type { SessionPrincipal } from "../../../context";
import type { AccessDao } from "../../database/dao/accessDao";
import type { ProjectDao, RepositoryIdentity } from "../../database/dao/projectDao";
import type { RepositoryAuthorizationService } from "../../github/repositoryAuthorizationService";
import type { GitHubRepositoryGateway, RepositoryContext } from "../../github/repositoryGateway";
import { RepositoryArchivedError, RepositoryAuthorizationNeededError, RepositoryNotFoundError } from "../../github/repositoryErrors";
import { resolveProjectRepository } from "./resolveProjectRepository";
import { ProjectAccessService } from "../access/projectAccessService";
import { AuthoringAccessPolicy } from "../access/authoringAccessPolicy";

export class RepositoryAccessService {
  private readonly access: ProjectAccessService;
  readonly authoring: AuthoringAccessPolicy;
  private readonly personalReads = new Map<string, { expiresAt: number; repository: RepositoryIdentity }>();
  constructor(private readonly projects: ProjectDao, permissions: AccessDao, private readonly authorization: RepositoryAuthorizationService, private readonly github: GitHubRepositoryGateway) { this.access = new ProjectAccessService(projects, permissions); this.authoring = new AuthoringAccessPolicy(permissions); }

  async requireRead(actor: SessionPrincipal, projectId: string): Promise<RepositoryIdentity> {
    const project = await this.access.requireProject(actor, projectId);
    if (!project.repository) throw new RepositoryNotFoundError();
    const { repository } = await resolveProjectRepository({ userId: actor.userId, repository: project.repository, authorization: this.authorization, github: this.github });
    await this.projects.updateRepositoryLabel?.(repository);
    return repository;
  }

  async requirePersonalRead(actor: SessionPrincipal, projectId: string): Promise<RepositoryIdentity> {
    const key = `${actor.userId}:${projectId}`;
    const cached = this.personalReads.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.repository;
    const project = await this.access.requireProject(actor, projectId);
    if (!project.repository) throw new RepositoryNotFoundError();
    const { repository, token } = await resolveProjectRepository({ userId: actor.userId, repository: project.repository, authorization: this.authorization, github: this.github });
    if (!token) throw new RepositoryAuthorizationNeededError();
    await this.projects.updateRepositoryLabel?.(repository);
    this.personalReads.set(key, { repository, expiresAt: Date.now() + 5_000 });
    return repository;
  }

  async personalContext(actor: SessionPrincipal, projectId: string) {
    const project = await this.access.requireProject(actor, projectId);
    if (!project.repository) throw new RepositoryNotFoundError();
    const { repository, token } = await resolveProjectRepository({ userId: actor.userId, repository: project.repository, authorization: this.authorization, github: this.github });
    const githubUserId = await this.authorization.githubIdentity(actor.userId);
    if (!token || !githubUserId) throw new RepositoryAuthorizationNeededError();
    await this.projects.updateRepositoryLabel?.(repository);
    return { project, repository, token, githubUserId, board: project.board ?? null };
  }

  async requireWrite(actor: SessionPrincipal, projectId: string) {
    const repository = await this.requireRead(actor, projectId);
    if (repository.archived) throw new RepositoryArchivedError();
    return repository;
  }

  async context(actor: SessionPrincipal, projectId: string): Promise<RepositoryContext> {
    const { repository, defaultBranch } = await this.contextCredentials(actor, projectId);
    return { repository, defaultBranch };
  }

  async contextCredentials(actor: SessionPrincipal, projectId: string) {
    const project = await this.access.requireProject(actor, projectId);
    if (!project.repository) throw new RepositoryNotFoundError();
    const { repository, token } = await resolveProjectRepository({ userId: actor.userId, repository: project.repository, authorization: this.authorization, github: this.github });
    const context = this.github.context ? await this.github.context(token, repository) : { repository, defaultBranch: "main" };
    await this.projects.updateRepositoryLabel?.(context.repository);
    return { ...context, token, publisherGithubId: await this.authorization.githubIdentity(actor.userId) };
  }
}
