import type { AccessDao } from "../../database/dao/accessDao";
import type { ProjectDao } from "../../database/dao/projectDao";
import type { PublishedIssue, PublishedIssueDao } from "../../database/dao/publishedIssueDao";
import type { GitHubProjectBoardGateway, ProjectBoard } from "../../github/projectBoardGateway";
import type { RepositoryAuthorizationService } from "../../github/repositoryAuthorizationService";
import { RepositoryAuthorizationNeededError } from "../../github/repositoryErrors";
import { ProjectAdminRequiredError, ProjectUnavailableError } from "../access/projectAccessService";
import { ProjectValidationError } from "./projectErrors";

export type BackfillAction = "to_add" | "added" | "already_present" | "closed" | "failed";
export type BackfillItem = { issueNumber: number; issueUrl: string; title: string; action: BackfillAction };
type Dependencies = { projects: ProjectDao; permissions: AccessDao; issues: PublishedIssueDao; authorization: RepositoryAuthorizationService; boards: GitHubProjectBoardGateway };
type BackfillInput = { projectId: string; userId: string; apply: boolean };
type BoardAccess = { token: string; board: ProjectBoard; apply: boolean };

export class BoardBackfillService {
  constructor(private readonly dependencies: Dependencies) {}

  async run(input: BackfillInput) {
    if (!await this.dependencies.permissions.isAdmin(input.userId)) throw new ProjectAdminRequiredError();
    const project = await this.dependencies.projects.findById?.(input.projectId);
    if (!project) throw new ProjectUnavailableError();
    if (!project.board) throw new ProjectValidationError("Project has no board configured");
    const token = await this.dependencies.authorization.accessToken(input.userId);
    if (!token) throw new RepositoryAuthorizationNeededError();
    const access = { token, board: project.board, apply: input.apply };
    const items: BackfillItem[] = [];
    for (const issue of await this.dependencies.issues.listByProject(input.projectId)) items.push({ issueNumber: issue.issueNumber, issueUrl: issue.issueUrl, title: issue.title, action: await this.settle(access, issue) });
    return { board: project.board.url, applied: input.apply, items };
  }

  private async settle(access: BoardAccess, issue: PublishedIssue): Promise<BackfillAction> {
    const target = { boardNodeId: access.board.nodeId, issueNodeId: issue.issueNodeId };
    try {
      const presence = await this.dependencies.boards.issuePresence(access.token, target);
      if (presence === "present") return "already_present";
      if (presence === "closed") return "closed";
      if (!access.apply) return "to_add";
      await this.dependencies.boards.placeInBacklog(access.token, target);
      return "added";
    } catch (error) {
      if (error instanceof RepositoryAuthorizationNeededError) throw error;
      return "failed";
    }
  }
}
