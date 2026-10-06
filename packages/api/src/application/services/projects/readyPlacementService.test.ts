import { describe, expect, it, vi } from "vitest";
import type { ProjectDao } from "../../database/dao/projectDao";
import type { GitHubProjectBoardGateway } from "../../github/projectBoardGateway";
import { ReadyPlacementService } from "./readyPlacementService";

const scope = { projectId: "p", token: "token", issueNodeId: "I_1" };
const board = { nodeId: "PVT_1", url: "https://github.com/orgs/acme/projects/7", title: "Roadmap" };

function build(projectBoard: typeof board | null) {
  const boards = { moveToReady: vi.fn(async () => {}) };
  const projects = { findById: vi.fn(async () => ({ board: projectBoard })) } as unknown as ProjectDao;
  return { boards, service: new ReadyPlacementService(projects, boards as unknown as GitHubProjectBoardGateway) };
}

describe("ReadyPlacementService", () => {
  it("moves the Issue on the board linked to the project", async () => {
    const { service, boards } = build(board);
    expect(await service.move(scope)).toBe("moved");
    expect(boards.moveToReady).toHaveBeenCalledWith("token", { boardNodeId: "PVT_1", issueNodeId: "I_1" });
  });

  it("does nothing for a project without a board", async () => {
    const { service, boards } = build(null);
    expect(await service.move(scope)).toBe("no_board");
    expect(boards.moveToReady).not.toHaveBeenCalled();
  });
});
