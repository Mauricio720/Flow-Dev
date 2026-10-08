import type { AssignedIssueGateway } from "../../github/assignedIssueGateway";
import type { AttemptRecord, ClaimRecord, IssueClaimDao } from "../../database/dao/issueClaimDao";
import { READY_STATUS_NAME, findOption } from "./assignedIssueRules";
import { isDispatchSettled } from "./issueClaimRules";
import { translated } from "./assignedIssueTranslation";

const IN_PROGRESS_READ_BACK = "in_progress";
type Deps = { gateway: AssignedIssueGateway; claims: IssueClaimDao; clock: () => Date };
type Target = { token: string; claim: ClaimRecord; attempt: AttemptRecord };

export class IssueClaimReconciler {
  constructor(private readonly deps: Deps) {}

  async resolve(target: Target): Promise<ClaimRecord | null> {
    const item = await translated(() => this.deps.gateway.item(target.token, target.claim.boardItemId));
    if (!item || item.boardNodeId !== target.claim.boardNodeId) return null;
    if (item.statusOptionId === target.claim.optionId) return this.settle(target, "claimed", null, IN_PROGRESS_READ_BACK);
    if (!this.windowElapsed(target.attempt)) return null;
    if (target.attempt.state === "reserved") return this.settle(target, "failed", "dispatch_abandoned", item.statusOptionId);
    return this.releaseIfReady(target, item.statusOptionId);
  }

  private async releaseIfReady(target: Target, observedOptionId: string | null) {
    const field = await translated(() => this.deps.gateway.statusField(target.token, target.claim.boardNodeId));
    const ready = findOption(field.options, READY_STATUS_NAME);
    if (!ready || observedOptionId !== ready.id) return null;
    return this.settle(target, "failed", "dispatch_not_applied", observedOptionId);
  }

  private windowElapsed(attempt: AttemptRecord) {
    return isDispatchSettled(attempt.dispatchStartedAt ?? attempt.createdAt, this.deps.clock());
  }

  private settle(target: Target, outcome: "claimed" | "failed", reason: string | null, readBackStatus: string | null) {
    return this.deps.claims.settle({ attemptId: target.attempt.id, fence: target.attempt.fence, outcome, reason, readBackStatus, at: this.deps.clock() });
  }
}
