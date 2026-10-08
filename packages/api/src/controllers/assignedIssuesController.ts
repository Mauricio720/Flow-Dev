import type { SessionPrincipal } from "../context";
import type { AssignedIssueDiscovery } from "../application/services/assigned-issues/assignedIssueDiscovery";
import type { AssignedIssueLookup } from "../application/services/assigned-issues/assignedIssueLookup";
import type { AssignedWorkReader } from "../application/services/assigned-issues/assignedWorkReader";
import type { ClaimReconciliation, ReconcileInput } from "../application/services/assigned-issues/claimReconciliation";
import type { ClaimInput, IssueClaimService } from "../application/services/assigned-issues/issueClaimService";
import type { ActiveWorkFilter } from "../application/services/assigned-issues/assignedIssueContracts";

type Scope = { projectId: string; taskId: string };
type Services = { discovery: AssignedIssueDiscovery; lookup: AssignedIssueLookup; claims: IssueClaimService; reconciliation: ClaimReconciliation; reader: AssignedWorkReader };

export class AssignedIssuesController {
  constructor(private readonly services: Services) {}

  list(actor: SessionPrincipal, input: { projectId: string; cursor?: string; limit: number }) {
    return this.services.discovery.list(actor, input);
  }

  byIssue(actor: SessionPrincipal, input: { projectId: string; issueNodeId: string; boardItemId: string }) {
    return this.services.lookup.byIssue(actor, input);
  }

  claim(actor: SessionPrincipal, input: ClaimInput) {
    return this.services.claims.claim(actor, input);
  }

  claimStatus(actor: SessionPrincipal, input: Scope) {
    return this.services.reader.claimStatus(actor, input);
  }

  reconcileClaim(actor: SessionPrincipal, input: ReconcileInput) {
    return this.services.reconciliation.reconcile(actor, input);
  }

  active(actor: SessionPrincipal, input: { projectId: string; filter: ActiveWorkFilter; cursor?: string; limit: number }) {
    return this.services.reader.active(actor, input);
  }

  byTask(actor: SessionPrincipal, input: Scope) {
    return this.services.reader.byTask(actor, input);
  }
}
