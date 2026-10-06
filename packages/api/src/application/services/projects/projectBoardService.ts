import type { SessionPrincipal } from "../../../context";
import type { AccessDao } from "../../database/dao/accessDao";
import type { ProjectDao } from "../../database/dao/projectDao";
import type { GitHubProjectBoardGateway, ProjectBoard } from "../../github/projectBoardGateway";
import type { RepositoryAuthorizationService } from "../../github/repositoryAuthorizationService";
import { RepositoryAuthorizationNeededError } from "../../github/repositoryErrors";
import { ProjectAccessService, ProjectUnavailableError } from "../access/projectAccessService";
import { parseBoardUrl } from "./projectBoardRules";

type Dependencies = { projects: ProjectDao; permissions: AccessDao; authorization: RepositoryAuthorizationService; boards: GitHubProjectBoardGateway };

export class ProjectBoardService {
  private readonly access: ProjectAccessService;
  constructor(private readonly dependencies: Dependencies) { this.access = new ProjectAccessService(dependencies.projects, dependencies.permissions); }

  async link(actor: SessionPrincipal, input: { projectId: string; boardUrl: string }) {
    await this.access.requireAdmin(actor);
    const reference = parseBoardUrl(input.boardUrl);
    const token = await this.dependencies.authorization.accessToken(actor.userId);
    if (!token) throw new RepositoryAuthorizationNeededError();
    const board = await this.dependencies.boards.resolve(token, reference);
    return this.save(input.projectId, board);
  }

  async unlink(actor: SessionPrincipal, projectId: string) {
    await this.access.requireAdmin(actor);
    return this.save(projectId, null);
  }

  private async save(projectId: string, board: ProjectBoard | null) {
    const project = await this.dependencies.projects.updateBoard?.(projectId, board);
    if (!project) throw new ProjectUnavailableError();
    return project;
  }
}
