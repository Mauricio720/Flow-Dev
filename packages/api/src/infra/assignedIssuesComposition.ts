import { AssignedIssueDiscovery } from "../application/services/assigned-issues/assignedIssueDiscovery";
import { AssignedIssueLookup } from "../application/services/assigned-issues/assignedIssueLookup";
import { AssignedIssueVerifier } from "../application/services/assigned-issues/assignedIssueVerifier";
import { AssignedWorkReader } from "../application/services/assigned-issues/assignedWorkReader";
import { ClaimReconciliation } from "../application/services/assigned-issues/claimReconciliation";
import { IssueClaimDispatcher } from "../application/services/assigned-issues/issueClaimDispatcher";
import { IssueClaimReconciler } from "../application/services/assigned-issues/issueClaimReconciler";
import { IssueClaimService } from "../application/services/assigned-issues/issueClaimService";
import { IssueSourceService } from "../application/services/assigned-issues/issueSourceService";
import { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { WorkOperability } from "../application/services/assigned-issues/workOperability";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import type { AssignedIssueGateway } from "../application/github/assignedIssueGateway";
import { AssignedIssuesController } from "../controllers/assignedIssuesController";
import { requireDatabase } from "./database/client";
import { DrizzleIssueClaimDao } from "./database/dao/assigned-issues/drizzleIssueClaimDao";
import { DrizzleIssueSourceDao } from "./database/dao/assigned-issues/drizzleIssueSourceDao";
import { DrizzleRepositoryAuthorizationStore } from "./database/dao/drizzleRepositoryAuthorizationStore";
import { RepositoryAuthorizationService } from "../application/github/repositoryAuthorizationService";
import { GitHubHttpAssignedIssueGateway } from "./github/githubAssignedIssueGateway";
import { createRepositoryAccessService } from "./repositoryAccessFactory";
import { oauthClient, tokenCipher } from "./composition";

type Overrides = { gateway?: AssignedIssueGateway; repositories?: RepositoryAccessService; clock?: () => Date; tokens?: (userId: string) => Promise<string | null> };

export function createWorkAuthorization(database: ReturnType<typeof requireDatabase>, overrides: Overrides = {}) {
  const gateway = overrides.gateway ?? new GitHubHttpAssignedIssueGateway();
  const repositories = overrides.repositories ?? createRepositoryAccessService(database);
  const operability = new WorkOperability({ gateway, verifier: new AssignedIssueVerifier(gateway) });
  return new WorkAuthorization({ repositories, sources: new DrizzleIssueSourceDao(database), claims: new DrizzleIssueClaimDao(database), operability });
}

export function createAssignedIssuesServices(database: ReturnType<typeof requireDatabase>, overrides: Overrides = {}) {
  const clock = overrides.clock ?? (() => new Date());
  const gateway = overrides.gateway ?? new GitHubHttpAssignedIssueGateway();
  const repositories = overrides.repositories ?? createRepositoryAccessService(database);
  const claims = new DrizzleIssueClaimDao(database);
  const sources = new IssueSourceService(new DrizzleIssueSourceDao(database), clock);
  const verifier = new AssignedIssueVerifier(gateway);
  const dispatcher = new IssueClaimDispatcher({ gateway, claims, clock });
  const reconciler = new IssueClaimReconciler({ gateway, claims, clock });
  const authorization = createWorkAuthorization(database, { gateway, repositories });
  const tokens = overrides.tokens ?? ((userId: string) => productionToken(database, userId));
  return {
    discovery: new AssignedIssueDiscovery(repositories, gateway, verifier),
    lookup: new AssignedIssueLookup({ repositories, verifier, sources }),
    claims: new IssueClaimService({ repositories, verifier, sources, claims, dispatcher }),
    reconciliation: new ClaimReconciliation({ repositories, claims, reconciler, tokens }),
    reader: new AssignedWorkReader({ repositories, claims, authorization }),
  };
}

function productionToken(database: ReturnType<typeof requireDatabase>, userId: string) {
  const cipher = tokenCipher();
  return new RepositoryAuthorizationService(new DrizzleRepositoryAuthorizationStore(database, cipher), oauthClient(), cipher).accessToken(userId);
}

export function createProductionAssignedIssuesController() {
  return new AssignedIssuesController(createAssignedIssuesServices(requireDatabase()));
}

export function createProductionClaimReconciliation() {
  return createAssignedIssuesServices(requireDatabase()).reconciliation;
}
