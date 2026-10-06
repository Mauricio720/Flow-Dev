import type { ProjectDao } from "../../database/dao/projectDao";
import type { GitHubProjectBoardGateway } from "../../github/projectBoardGateway";
import { RepositoryAuthorizationNeededError } from "../../github/repositoryErrors";

const PLACEMENT_ATTEMPTS = 2;
export type BacklogPlacement = "placed" | "no_board";
type BoardScope = { projectId: string; token: string };

export class BacklogPlacementService {
  constructor(private readonly projects: ProjectDao, private readonly boards: GitHubProjectBoardGateway) {}

  async assertAuthorized(scope: BoardScope) {
    const board = await this.boardOf(scope.projectId);
    if (!board) return;
    try { await this.boards.assertBacklog(scope.token, board.nodeId); } catch (error) { if (error instanceof RepositoryAuthorizationNeededError) throw error; }
  }

  async place(scope: BoardScope & { issueNodeId: string; priorityPoints?: number | null }): Promise<BacklogPlacement> {
    const board = await this.boardOf(scope.projectId);
    if (!board) return "no_board";
    const target = { boardNodeId: board.nodeId, issueNodeId: scope.issueNodeId, priorityPoints: scope.priorityPoints };
    for (let attempt = 1; attempt <= PLACEMENT_ATTEMPTS; attempt += 1) {
      try { await this.boards.placeInBacklog(scope.token, target); break; } catch (error) { if (attempt === PLACEMENT_ATTEMPTS) throw error; }
    }
    return "placed";
  }

  private async boardOf(projectId: string) { return (await this.projects.findById?.(projectId))?.board ?? null; }
}
