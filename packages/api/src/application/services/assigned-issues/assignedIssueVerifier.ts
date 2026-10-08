import type { AssignedIssueGateway, BoardItemFacts } from "../../github/assignedIssueGateway";
import { IN_PROGRESS_STATUS_NAME, READY_STATUS_NAME, assessItem, findOption, verifiedIssue } from "./assignedIssueRules";
import type { Assessment, VerifiedIssue } from "./assignedIssueRules";
import { AssignedIssueError } from "./assignedIssueErrors";
import type { AssignedIssueReason } from "./assignedIssueErrors";
import { translated } from "./assignedIssueTranslation";

const MAX_ASSIGNEE_PAGES = 10;
export type VerifyContext = { token: string; githubUserId: string; boardNodeId: string; repository: { githubId: string; nodeId: string } };
export type VerifyInput = { issueNodeId: string; boardItemId: string; missingItem: AssignedIssueReason };
export type Verified = { item: BoardItemFacts; issue: VerifiedIssue; assessment: Assessment; inProgressOptionId: string | null; fieldId: string };

export class AssignedIssueVerifier {
  constructor(private readonly gateway: AssignedIssueGateway) {}

  async verify(context: VerifyContext, input: VerifyInput): Promise<Verified> {
    const field = await translated(() => this.gateway.statusField(context.token, context.boardNodeId));
    const item = await translated(() => this.gateway.item(context.token, input.boardItemId));
    if (!item) throw new AssignedIssueError(input.missingItem);
    if (item.archived || item.contentType !== "Issue" || item.boardNodeId !== context.boardNodeId) throw new AssignedIssueError("board_item_invalid");
    const issue = verifiedIssue(item);
    if (!issue) throw new AssignedIssueError("issue_unavailable");
    if (issue.nodeId !== input.issueNodeId) throw new AssignedIssueError("board_item_invalid");
    if (issue.repositoryNodeId !== context.repository.nodeId || issue.repositoryId !== context.repository.githubId) throw new AssignedIssueError("repository_mismatch");
    const ready = findOption(field.options, READY_STATUS_NAME);
    const progress = field.options.filter((option) => option.name.trim().toLowerCase() === IN_PROGRESS_STATUS_NAME);
    const assessment = await this.assessEligibility(context, item, ready?.id ?? "");
    return { item, issue, assessment, inProgressOptionId: progress.length === 1 ? progress[0]!.id : null, fieldId: field.fieldId };
  }

  async assessEligibility(context: VerifyContext, item: BoardItemFacts, readyOptionId: string) {
    const eligibility = { repositoryNodeId: context.repository.nodeId, githubUserId: context.githubUserId, readyOptionId, boardNodeId: context.boardNodeId };
    const assessment = assessItem(item, eligibility);
    if (assessment !== "assignees_incomplete") return assessment;
    return await this.assigneePages(context, item) ? "eligible" : "not_assigned";
  }

  async isAssigned(context: VerifyContext, item: BoardItemFacts) {
    if (item.issue!.assignees.some((assignee) => assignee.githubId === context.githubUserId)) return true;
    if (!item.issue!.assigneesHasNextPage) return false;
    return this.assigneePages(context, item);
  }

  private async assigneePages(context: VerifyContext, item: BoardItemFacts) {
    let after = item.issue!.assigneesCursor;
    for (let page = 0; page < MAX_ASSIGNEE_PAGES; page += 1) {
      const result = await translated(() => this.gateway.assignees(context.token, { issueNodeId: item.issue!.nodeId!, after }));
      if (result.assignees.some((assignee) => assignee.githubId === context.githubUserId)) return true;
      if (!result.hasNextPage) return false;
      after = result.endCursor;
    }
    return false;
  }
}
