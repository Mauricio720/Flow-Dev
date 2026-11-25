import type { ProjectDao } from "../../database/dao/projectDao";
import type { BoardStatus, GitHubProjectBoardGateway } from "../../github/projectBoardGateway";
import { RepositoryAuthorizationNeededError } from "../../github/repositoryErrors";

const PLACEMENT_ATTEMPTS = 2;
export type BoardPlacement = "placed" | "no_board";
type BoardScope = { projectId: string; token: string };

export class BoardPlacementService {
  constructor(private readonly projects: ProjectDao, private readonly boards: GitHubProjectBoardGateway) {}

  async assertAuthorized(scope: BoardScope) {
    const board = await this.boardOf(scope.projectId);
    if (!board) return;
    try { await this.boards.statuses(scope.token, board.nodeId); } catch (error) { if (error instanceof RepositoryAuthorizationNeededError) throw error; }
  }

  async statuses(scope: BoardScope): Promise<BoardStatus[] | null> {
    const board = await this.boardOf(scope.projectId);
    return board ? this.boards.statuses(scope.token, board.nodeId) : null;
  }

  async place(scope: BoardScope & { issueNodeId: string; priorityPoints?: number | null; status: BoardStatus }): Promise<BoardPlacement> {
    const board = await this.boardOf(scope.projectId);
    if (!board) return "no_board";
    const target = { boardNodeId: board.nodeId, issueNodeId: scope.issueNodeId, priorityPoints: scope.priorityPoints, status: scope.status };
    for (let attempt = 1; attempt <= PLACEMENT_ATTEMPTS; attempt += 1) {
      try { await this.boards.place(scope.token, target); break; } catch (error) { if (attempt === PLACEMENT_ATTEMPTS) throw error; }
    }
    return "placed";
  }

  private async boardOf(projectId: string) { return (await this.projects.findById?.(projectId))?.board ?? null; }
}
