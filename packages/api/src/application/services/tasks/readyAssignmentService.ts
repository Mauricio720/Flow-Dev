import type { PublicationWorkerClaim, TaskPublicationWorkerDao } from "../../database/dao/taskPublicationWorkerDao";
import type { IssueReceipt } from "../../github/issueGateway";
import type { BoardPlacementService } from "../projects/boardPlacementService";
import { BoardStatusMissingError } from "../../github/projectBoardGateway";
import { RepositoryAuthorizationNeededError, RepositoryRateLimitedError } from "../../github/repositoryErrors";
import { readyRefusal } from "./readyAssignmentRules";
import { TaskError } from "./taskErrors";
import type { ReadyAssignmentResult } from "./taskContracts";

type ReadyRecorder = Pick<TaskPublicationWorkerDao, "recordReadyAssignment">;
export type ReadyCheck = { projectId: string; token: string; assignToSelf: boolean; canWriteContents: boolean };
export type ReadySettlement = { claim: PublicationWorkerClaim; token: string; receipt: IssueReceipt; priorityPoints: number | null };

export class ReadyAssignmentService {
  constructor(private readonly board: BoardPlacementService, private readonly results?: ReadyRecorder) {}

  async assertPossible(check: ReadyCheck) {
    if (!check.assignToSelf) return this.board.assertAuthorized({ projectId: check.projectId, token: check.token });
    try {
      const statuses = await this.board.statuses({ projectId: check.projectId, token: check.token });
      const reason = readyRefusal({ hasBoard: statuses !== null, statuses: statuses ?? [], canWriteContents: check.canWriteContents });
      if (reason) throw new TaskError(reason);
    } catch (error) { throw readyCheckError(error); }
  }

  async settle(input: ReadySettlement): Promise<ReadyAssignmentResult | null> {
    if (!input.claim.assignToSelf) { await this.placeBestEffort(input, "backlog"); return null; }
    if (!input.receipt.assigneeGithubIds.includes(input.claim.publisherGithubId)) {
      await this.placeBestEffort(input, "backlog");
      await this.record(input.claim, "not_assigned");
      console.error("[tasks-worker] issue was not assigned to publisher", input.claim.taskId);
      return "not_assigned";
    }
    try {
      await this.board.place({ projectId: input.claim.projectId, token: input.token, issueNodeId: input.receipt.nodeId, priorityPoints: input.priorityPoints, status: "ready" });
      await this.record(input.claim, "ready");
      return "ready";
    } catch {
      await this.record(input.claim, "ready_failed");
      console.error("[tasks-worker] Ready placement failed", input.claim.taskId);
      return "ready_failed";
    }
  }

  private async placeBestEffort(input: ReadySettlement, status: "backlog") {
    try { await this.board.place({ projectId: input.claim.projectId, token: input.token, issueNodeId: input.receipt.nodeId, priorityPoints: input.priorityPoints, status }); }
    catch { console.error("[tasks-worker] backlog placement failed", input.claim.taskId); }
  }

  private async record(claim: PublicationWorkerClaim, result: ReadyAssignmentResult) {
    try { await this.results?.recordReadyAssignment(claim, result); }
    catch { console.error("[tasks-worker] Ready result recording failed", claim.taskId); }
  }
}

function readyCheckError(error: unknown) {
  if (error instanceof TaskError) return error;
  if (error instanceof RepositoryAuthorizationNeededError) return new TaskError("repository_authorization_needed", undefined, error);
  if (error instanceof RepositoryRateLimitedError) return new TaskError("provider_rate_limited", undefined, error, error.retryAfterSeconds);
  if (error instanceof BoardStatusMissingError) return new TaskError("ready_status_missing", undefined, error);
  return new TaskError("provider_unavailable", undefined, error);
}
