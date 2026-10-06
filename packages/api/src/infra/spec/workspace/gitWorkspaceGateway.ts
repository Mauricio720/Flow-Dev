import type { SpecWorkspaceGateway, AttemptIdentity, PrepareSpecWorkspace, PromoteSpecPackage, VerifySpecPackage, WorkspaceIdentity, ManifestEntry } from "../../../application/spec/specWorkspaceGateway";
import { buildCandidateWorkspace } from "./candidateWorkspace";
import { freezeCandidate } from "./candidateFreeze";
import { attemptPaths, planCheckout } from "./checkoutPlan";
import { inspectCanonical, verifyCanonical } from "./canonicalInspect";
import { promoteCanonical } from "./packagePromotion";
import { prepareCheckout, type CheckoutDependencies } from "./prepareCheckout";

export class GitSpecWorkspaceGateway implements SpecWorkspaceGateway {
  constructor(private readonly deps: CheckoutDependencies) {}

  prepare(input: PrepareSpecWorkspace) { return prepareCheckout(this.deps, input); }

  candidate(input: AttemptIdentity & { upstream: ManifestEntry[]; previous: ManifestEntry[] }) {
    return buildCandidateWorkspace({ plan: this.plan(input), attemptId: input.attemptId, upstream: input.upstream, previous: input.previous });
  }

  freeze(input: AttemptIdentity) { return freezeCandidate(attemptPaths(this.plan(input), input.attemptId).candidatePath, input.stage); }
  inspect(input: WorkspaceIdentity) { return inspectCanonical(this.plan(input).canonicalPath); }
  promote(input: PromoteSpecPackage) { return promoteCanonical(this.plan(input).canonicalPath, input); }
  verify(input: VerifySpecPackage) { return verifyCanonical(this.plan(input).canonicalPath, input.expected); }

  private plan(input: WorkspaceIdentity) {
    return planCheckout({ root: this.deps.root, repositoryGithubId: input.repositoryGithubId, taskId: input.taskId });
  }
}
