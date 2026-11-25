import { describe, expect, it, vi } from "vitest";
import type { BoardStatus, GitHubProjectBoardGateway } from "../../github/projectBoardGateway";
import type { ProjectDao } from "../../database/dao/projectDao";
import type { PublicationWorkerClaim } from "../../database/dao/taskPublicationWorkerDao";
import type { IssueReceipt } from "../../github/issueGateway";
import { BoardPlacementService } from "../projects/boardPlacementService";
import { ReadyAssignmentService } from "./readyAssignmentService";

const claim = { projectId: "p1", taskId: "t1", publisherGithubId: "88", assignToSelf: true } as PublicationWorkerClaim;
const receipt = { nodeId: "I1", assigneeGithubIds: ["88"] } as IssueReceipt;

function setup() {
  const place = vi.fn(async (_token: string, _input: { status: BoardStatus }) => {});
  const boards = { statuses: vi.fn(async () => ["backlog", "ready"] as BoardStatus[]), place } as unknown as GitHubProjectBoardGateway;
  const projects = { findById: async () => ({ board: { nodeId: "B1" } }) } as unknown as ProjectDao;
  const recordReadyAssignment = vi.fn(async () => true);
  const board = new BoardPlacementService(projects, boards);
  return { service: new ReadyAssignmentService(board, { recordReadyAssignment }), place, recordReadyAssignment };
}

describe("ReadyAssignmentService", () => {
  it("places the assigned issue in Ready with priority and records ready", async () => {
    const { service, place, recordReadyAssignment } = setup();
    await expect(service.settle({ claim, token: "token", receipt, priorityPoints: 5 })).resolves.toBe("ready");
    expect(place).toHaveBeenCalledWith("token", { boardNodeId: "B1", issueNodeId: "I1", priorityPoints: 5, status: "ready" });
    expect(recordReadyAssignment).toHaveBeenCalledWith(claim, "ready");
  });
  it("uses Backlog and records not_assigned when GitHub omitted the publisher", async () => {
    const { service, place, recordReadyAssignment } = setup();
    await service.settle({ claim, token: "token", receipt: { ...receipt, assigneeGithubIds: [] }, priorityPoints: null });
    expect(place).toHaveBeenCalledWith("token", { boardNodeId: "B1", issueNodeId: "I1", priorityPoints: null, status: "backlog" });
    expect(recordReadyAssignment).toHaveBeenCalledWith(claim, "not_assigned");
  });
  it("retries Ready twice and records ready_failed without throwing", async () => {
    const { service, place, recordReadyAssignment } = setup();
    place.mockRejectedValue(new Error("unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(service.settle({ claim, token: "token", receipt, priorityPoints: 5 })).resolves.toBe("ready_failed");
    expect(place).toHaveBeenCalledTimes(2);
    expect(recordReadyAssignment).toHaveBeenCalledWith(claim, "ready_failed");
  });
  it("does not record a result without the option and treats Backlog failure as best effort", async () => {
    const { service, place, recordReadyAssignment } = setup();
    place.mockRejectedValue(new Error("unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(service.settle({ claim: { ...claim, assignToSelf: false }, token: "token", receipt, priorityPoints: null })).resolves.toBeNull();
    expect(recordReadyAssignment).not.toHaveBeenCalled();
  });
  it("retries once after a transient Ready failure", async () => {
    const { service, place, recordReadyAssignment } = setup();
    place.mockRejectedValueOnce(new Error("transient"));
    await expect(service.settle({ claim, token: "token", receipt, priorityPoints: 5 })).resolves.toBe("ready");
    expect(place).toHaveBeenCalledTimes(2);
    expect(recordReadyAssignment).toHaveBeenCalledWith(claim, "ready");
  });
});
