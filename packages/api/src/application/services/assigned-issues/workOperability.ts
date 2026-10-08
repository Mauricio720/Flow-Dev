import type { AssignedIssueGateway } from "../../github/assignedIssueGateway";
import type { ClaimRecord } from "../../database/dao/issueClaimDao";
import { IN_PROGRESS_STATUS_NAME, sourceContentHash, verifiedIssue } from "./assignedIssueRules";
import type { AssignedIssueReason } from "./assignedIssueErrors";
import { translated } from "./assignedIssueTranslation";
import type { AssignedIssueVerifier, VerifyContext } from "./assignedIssueVerifier";

type Deps = { gateway: AssignedIssueGateway; verifier: AssignedIssueVerifier };
type Operator = { token: string; githubUserId: string; repositoryNodeId: string; repositoryId: string; archived: boolean; issueNodeId: string };
const OPEN_STATE = "OPEN";

export type OperabilityResult = { reason: AssignedIssueReason | null; contentHash: string | null };

export class WorkOperability {
  constructor(private readonly deps: Deps) {}

  async evaluate(operator: Operator, claim: ClaimRecord): Promise<OperabilityResult> {
    if (operator.archived) return { reason: "issue_ineligible", contentHash: null };
    const field = await translated(() => this.deps.gateway.statusField(operator.token, claim.boardNodeId));
    const option = field.options.find((candidate) => candidate.id === claim.optionId);
    if (option?.name.trim().toLowerCase() !== IN_PROGRESS_STATUS_NAME) return { reason: "board_status_changed", contentHash: null };
    const item = await translated(() => this.deps.gateway.item(operator.token, claim.boardItemId));
    if (!item || item.archived || item.boardNodeId !== claim.boardNodeId) return { reason: "board_status_changed", contentHash: null };
    const issue = verifiedIssue(item);
    if (!issue || issue.nodeId !== operator.issueNodeId || item.issue!.state !== OPEN_STATE) return { reason: "issue_ineligible", contentHash: null };
    if (issue.repositoryNodeId !== operator.repositoryNodeId || issue.repositoryId !== operator.repositoryId) return { reason: "issue_ineligible", contentHash: null };
    const contentHash = sourceContentHash({ repositoryId: issue.repositoryId, issueNodeId: issue.nodeId, title: issue.title, bodyMarkdown: issue.body });
    if (item.statusOptionId !== claim.optionId) return { reason: "board_status_changed", contentHash };
    const context: VerifyContext = { token: operator.token, githubUserId: operator.githubUserId, boardNodeId: claim.boardNodeId, repository: { githubId: operator.repositoryId, nodeId: operator.repositoryNodeId } };
    return { reason: await this.deps.verifier.isAssigned(context, item) ? null : "issue_ineligible", contentHash };
  }
}
