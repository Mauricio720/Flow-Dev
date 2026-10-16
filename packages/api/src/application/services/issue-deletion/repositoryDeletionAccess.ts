import type { SessionPrincipal } from "../../../context";
import type { AccessDao } from "../../database/dao/accessDao";
import { ProjectUnavailableError, type ProjectAccessService } from "../access/projectAccessService";
import { RepositoryNotFoundError } from "../../github/repositoryErrors";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import type { RepositoryAuthorizationService } from "../../github/repositoryAuthorizationService";
import type { DeletionAccess, PersonalContext, RepositoryBinding } from "./deletionPorts";

export class RepositoryDeletionAccess implements DeletionAccess {
  constructor(
    private readonly projects: ProjectAccessService,
    private readonly permissions: AccessDao,
    private readonly authorization: RepositoryAuthorizationService,
    private readonly repositories: RepositoryAccessService,
  ) {}

  async requireProject(actor: SessionPrincipal, projectId: string): Promise<RepositoryBinding | null> {
    try {
      const project = await this.projects.requireProject(actor, projectId);
      if (!project.repository) return null;
      return { repositoryId: project.repository.githubId, repositoryNodeId: project.repository.nodeId, owner: project.repository.owner, name: project.repository.name };
    } catch (error) {
      if (error instanceof ProjectUnavailableError) return null;
      throw error;
    }
  }

  isAdmin(actor: SessionPrincipal): Promise<boolean> {
    return this.permissions.isAdmin(actor.userId);
  }

  githubIdentity(userId: string): Promise<string | null> {
    return this.authorization.githubIdentity(userId);
  }

  async personalContext(actor: SessionPrincipal, projectId: string): Promise<PersonalContext> {
    try {
      const context = await this.repositories.personalContext(actor, projectId);
      return { kind: "ok", token: context.token, githubUserId: context.githubUserId, repositoryId: context.repository.githubId, repositoryNodeId: context.repository.nodeId, owner: context.repository.owner, name: context.repository.name };
    } catch (error) {
      if (error instanceof ProjectUnavailableError || error instanceof RepositoryNotFoundError) return { kind: "unavailable" };
      return { kind: "authorization" };
    }
  }
}
