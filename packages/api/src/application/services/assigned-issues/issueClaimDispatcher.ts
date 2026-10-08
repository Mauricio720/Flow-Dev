import type { AssignedIssueGateway, BoardItemFacts } from "../../github/assignedIssueGateway";
import { ProjectBoardNotFoundError } from "../../github/projectBoardGateway";
import { RepositoryAuthorizationNeededError, RepositoryForbiddenError } from "../../github/repositoryErrors";
import type { AttemptRecord, ClaimRecord, IssueClaimDao } from "../../database/dao/issueClaimDao";
import { translateAssignedIssueError } from "./assignedIssueTranslation";
import { AssignedIssueError } from "./assignedIssueErrors";

const IN_PROGRESS_READ_BACK = "in_progress";
const DEFINITIVE_REJECTIONS = [RepositoryForbiddenError, RepositoryAuthorizationNeededError, ProjectBoardNotFoundError];
export type DispatchInput = { token: string; claim: ClaimRecord; attempt: AttemptRecord };
type Deps = { gateway: AssignedIssueGateway; claims: IssueClaimDao; clock: () => Date };

export class IssueClaimDispatcher {
  constructor(private readonly deps: Deps) {}

  async dispatch(input: DispatchInput): Promise<ClaimRecord> {
    const { claim, attempt } = input;
    const started = await this.deps.claims.beginDispatch({ attemptId: attempt.id, fence: attempt.fence, at: this.deps.clock() });
    if (!started) return claim;
    try {
      await this.deps.gateway.setStatus(input.token, { boardNodeId: claim.boardNodeId, itemId: claim.boardItemId, fieldId: claim.statusFieldId, optionId: claim.optionId });
    } catch (error) {
      return this.afterFailure(input, error);
    }
    return this.readBack(input);
  }

  private async afterFailure(input: DispatchInput, error: unknown) {
    if (DEFINITIVE_REJECTIONS.some((type) => error instanceof type)) return this.confirmRejection(input);
    return this.settle(input, { outcome: "uncertain", reason: uncertainReason(error), readBackStatus: null });
  }

  private async confirmRejection(input: DispatchInput) {
    const item = await this.read(input);
    if (item && item.statusOptionId === input.claim.optionId) return this.settle(input, { outcome: "claimed", reason: null, readBackStatus: IN_PROGRESS_READ_BACK });
    if (item) return this.settle(input, { outcome: "failed", reason: "provider_rejected", readBackStatus: item.statusOptionId });
    return this.settle(input, { outcome: "uncertain", reason: "read_back_failed", readBackStatus: null });
  }

  private async readBack(input: DispatchInput) {
    const item = await this.read(input);
    if (!item) return this.settle(input, { outcome: "uncertain", reason: "read_back_failed", readBackStatus: null });
    if (item.statusOptionId === input.claim.optionId) return this.settle(input, { outcome: "claimed", reason: null, readBackStatus: IN_PROGRESS_READ_BACK });
    return this.settle(input, { outcome: "uncertain", reason: "read_back_mismatch", readBackStatus: item.statusOptionId });
  }

  private async read(input: DispatchInput): Promise<BoardItemFacts | null> {
    try { return await this.deps.gateway.item(input.token, input.claim.boardItemId); } catch { return null; }
  }

  private settle(input: DispatchInput, result: { outcome: "claimed" | "failed" | "uncertain"; reason: string | null; readBackStatus: string | null }) {
    return this.deps.claims.settle({ attemptId: input.attempt.id, fence: input.attempt.fence, at: this.deps.clock(), ...result });
  }
}

function uncertainReason(error: unknown) {
  const translatedError = translateAssignedIssueError(error);
  return translatedError instanceof AssignedIssueError ? translatedError.reason : "provider_unavailable";
}

