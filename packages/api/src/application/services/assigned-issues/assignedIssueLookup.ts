import type { SessionPrincipal } from "../../../context";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { AssignedIssueError } from "./assignedIssueErrors";
import { translated } from "./assignedIssueTranslation";
import type { AssignedIssueVerifier } from "./assignedIssueVerifier";
import type { IssueSourceService } from "./issueSourceService";
import { verifyContext } from "./issueClaimService";

type Deps = { repositories: RepositoryAccessService; verifier: AssignedIssueVerifier; sources: IssueSourceService };

export class AssignedIssueLookup {
  constructor(private readonly deps: Deps) {}

  async byIssue(actor: SessionPrincipal, input: { projectId: string; issueNodeId: string; boardItemId: string }) {
    const context = await translated(() => this.deps.repositories.personalContext(actor, input.projectId));
    if (!context.board) throw new AssignedIssueError("board_missing");
    const verified = await this.deps.verifier.verify(verifyContext(context), { issueNodeId: input.issueNodeId, boardItemId: input.boardItemId, missingItem: "issue_unavailable" });
    const identity = { projectId: input.projectId, repositoryId: verified.issue.repositoryId, repositoryNodeId: verified.issue.repositoryNodeId, issueNodeId: verified.issue.nodeId };
    const source = await this.deps.sources.existing(identity);
    const { issue } = verified.item;
    return { issue: { issueNodeId: verified.issue.nodeId, boardItemId: input.boardItemId, number: verified.issue.number, title: verified.issue.title, url: verified.issue.url, state: issue!.state, repository: { owner: issue!.repositoryOwner, name: issue!.repositoryName }, assignees: issue!.assignees }, eligibility: { eligible: verified.assessment === "eligible", reason: verified.assessment }, taskId: source?.taskId ?? null };
  }
}
