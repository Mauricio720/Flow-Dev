import type { SessionPrincipal } from "../../../context";
import type { IssueClaimDao } from "../../database/dao/issueClaimDao";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { AssignedIssueError } from "./assignedIssueErrors";
import { requestPayloadHash } from "./assignedIssueRules";
import { translated } from "./assignedIssueTranslation";
import type { AssignedIssueVerifier, Verified, VerifyContext } from "./assignedIssueVerifier";
import type { ClaimResult } from "./assignedIssueContracts";
import { claimResult } from "./claimResults";
import type { IssueClaimDispatcher } from "./issueClaimDispatcher";
import { isHeld } from "./issueClaimRules";
import type { IssueSourceService } from "./issueSourceService";

export type ClaimInput = { projectId: string; issueNodeId: string; boardItemId: string; requestKey: string };
type Deps = { repositories: RepositoryAccessService; verifier: AssignedIssueVerifier; sources: IssueSourceService; claims: IssueClaimDao; dispatcher: IssueClaimDispatcher };
type Context = Awaited<ReturnType<RepositoryAccessService["personalContext"]>>;

export class IssueClaimService {
  constructor(private readonly deps: Deps) {}

  async claim(actor: SessionPrincipal, input: ClaimInput): Promise<ClaimResult> {
    const context = await translated(() => this.deps.repositories.personalContext(actor, input.projectId));
    if (!context.board) throw new AssignedIssueError("board_missing");
    const payloadHash = requestPayloadHash({ kind: "claim", issueNodeId: input.issueNodeId, boardItemId: input.boardItemId });
    const replay = await this.replay(actor.userId, input, payloadHash);
    if (replay) return replay;
    const held = await this.held(context, input);
    if (held) return held;
    const verified = await this.deps.verifier.verify(verifyContext(context), { issueNodeId: input.issueNodeId, boardItemId: input.boardItemId, missingItem: "board_item_invalid" });
    assertClaimable(verified);
    return this.reserve({ actor, context, input, payloadHash, verified });
  }

  private async replay(userId: string, input: ClaimInput, payloadHash: string) {
    const attempt = await this.deps.claims.attemptByKey(userId, input.projectId, input.requestKey);
    if (!attempt) return null;
    if (attempt.kind !== "claim" || attempt.payloadHash !== payloadHash) throw new AssignedIssueError("request_key_reused");
    return claimResult((await this.deps.claims.claimBySource(attempt.sourceId))!, true);
  }

  private async held(context: Context, input: ClaimInput) {
    const identity = { projectId: input.projectId, repositoryId: context.repository.githubId, repositoryNodeId: context.repository.nodeId, issueNodeId: input.issueNodeId };
    const source = await this.deps.sources.existing(identity);
    const claim = source && await this.deps.claims.claimBySource(source.sourceId);
    return claim && isHeld(claim.state) ? claimResult(claim, true) : null;
  }

  private async reserve(input: { actor: SessionPrincipal; context: Context; input: ClaimInput; payloadHash: string; verified: Verified }) {
    const { actor, context, verified } = input;
    const source = this.deps.sources.factsFor({ projectId: input.input.projectId, actorId: actor.userId, issue: verified.issue });
    const board = { boardNodeId: context.board!.nodeId, boardItemId: input.input.boardItemId, statusFieldId: verified.fieldId, optionId: verified.inProgressOptionId! };
    const outcome = await this.deps.claims.reserve({ source, claimantUserId: actor.userId, requestKey: input.input.requestKey, payloadHash: input.payloadHash, board });
    if (outcome.kind === "held") return claimResult(outcome.claim, true);
    const settled = await this.deps.dispatcher.dispatch({ token: context.token, claim: outcome.claim, attempt: outcome.attempt });
    return claimResult(settled, false);
  }
}

export function verifyContext(context: Context): VerifyContext {
  return { token: context.token, githubUserId: context.githubUserId, boardNodeId: context.board!.nodeId, repository: { githubId: context.repository.githubId, nodeId: context.repository.nodeId } };
}

function assertClaimable(verified: Verified) {
  if (!verified.inProgressOptionId) throw new AssignedIssueError("in_progress_missing");
  if (verified.assessment !== "eligible") throw new AssignedIssueError("issue_ineligible");
}
