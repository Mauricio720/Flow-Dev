import type { SessionPrincipal } from "../../../context";
import type { IssueClaimDao } from "../../database/dao/issueClaimDao";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { AssignedIssueError } from "./assignedIssueErrors";
import { requestPayloadHash } from "./assignedIssueRules";
import { translated } from "./assignedIssueTranslation";
import type { ClaimResult } from "./assignedIssueContracts";
import { claimResult } from "./claimResults";
import type { IssueClaimReconciler } from "./issueClaimReconciler";

export type ReconcileInput = { projectId: string; taskId: string; requestKey: string };
type Deps = { repositories: RepositoryAccessService; claims: IssueClaimDao; reconciler: IssueClaimReconciler; tokens: (userId: string) => Promise<string | null> };

export class ClaimReconciliation {
  constructor(private readonly deps: Deps) {}

  async reconcile(actor: SessionPrincipal, input: ReconcileInput): Promise<ClaimResult> {
    const context = await translated(() => this.deps.repositories.personalContext(actor, input.projectId));
    const claim = await this.deps.claims.claimByTask(input.projectId, input.taskId);
    if (!claim) throw new AssignedIssueError("work_unavailable");
    const payloadHash = requestPayloadHash({ kind: "reconcile", taskId: input.taskId });
    await this.assertKey(actor.userId, input, payloadHash);
    if (claim.candidateUserId !== actor.userId) throw new AssignedIssueError("claimant_required");
    await this.deps.claims.recordReconcile({ sourceId: claim.sourceId, projectId: input.projectId, claimantUserId: actor.userId, requestKey: input.requestKey, payloadHash, fence: claim.fence });
    if (claim.state === "claimed" || claim.state === "failed") return claimResult(claim, false);
    const attempt = await this.deps.claims.unresolvedAttempt(claim.sourceId);
    const resolved = attempt && await this.deps.reconciler.resolve({ token: context.token, claim, attempt });
    if (!resolved) throw new AssignedIssueError("claim_unresolved");
    return claimResult(resolved, false);
  }

  async sweep(limit: number) {
    let resolved = 0;
    for (const { claim, attempt } of await this.deps.claims.unresolved(limit)) {
      const token = await this.deps.tokens(claim.candidateUserId).catch(() => null);
      const result = token ? await this.deps.reconciler.resolve({ token, claim, attempt }).catch(() => null) : null;
      if (result) resolved += 1;
    }
    return resolved;
  }

  private async assertKey(userId: string, input: ReconcileInput, payloadHash: string) {
    const existing = await this.deps.claims.attemptByKey(userId, input.projectId, input.requestKey);
    if (existing && (existing.kind !== "reconcile" || existing.payloadHash !== payloadHash)) throw new AssignedIssueError("request_key_reused");
  }
}
