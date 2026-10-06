import type { ProjectDao } from "../../database/dao/projectDao";
import type { GitHubProjectBoardGateway } from "../../github/projectBoardGateway";

export type ReadyPlacement = "moved" | "no_board";
type ReadyScope = { projectId: string; token: string; issueNodeId: string };

export class ReadyPlacementService {
  constructor(private readonly projects: ProjectDao, private readonly boards: GitHubProjectBoardGateway) {}

  async move(scope: ReadyScope): Promise<ReadyPlacement> {
    const board = (await this.projects.findById?.(scope.projectId))?.board ?? null;
    if (!board) return "no_board";
    await this.boards.moveToReady(scope.token, { boardNodeId: board.nodeId, issueNodeId: scope.issueNodeId });
    return "moved";
  }
}
