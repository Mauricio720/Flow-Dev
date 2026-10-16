import type { SessionPrincipal } from "../../../context";
import type { IssueFacts } from "../../github/issueDeletionGateway";
import type { DeletionFailureReason, DeletionOperation } from "./issueDeletionContracts";

export type RepositoryBinding = { repositoryId: string; repositoryNodeId: string; owner: string; name: string };

export type PersonalContext =
  | { kind: "ok"; token: string; githubUserId: string; repositoryId: string; repositoryNodeId: string; owner: string; name: string }
  | { kind: "authorization" }
  | { kind: "unavailable" };

export interface DeletionAccess {
  requireProject(actor: SessionPrincipal, projectId: string): Promise<RepositoryBinding | null>;
  isAdmin(actor: SessionPrincipal): Promise<boolean>;
  githubIdentity(userId: string): Promise<string | null>;
  personalContext(actor: SessionPrincipal, projectId: string): Promise<PersonalContext>;
}

export type ProviderOutcome<T> = { ok: true; value: T } | { ok: false; failure: DeletionFailureReason; retryAfterSeconds?: number };

export type ProviderInspectTarget = { issueNodeId: string; repositoryId: string; repositoryNodeId: string; issueNumber: number };

export interface DeletionProvider {
  tokenFor(operation: Pick<DeletionOperation, "initiatorUserId">): Promise<string | null>;
  inspect(token: string, target: ProviderInspectTarget): Promise<ProviderOutcome<IssueFacts>>;
  remove(token: string, target: ProviderInspectTarget): Promise<ProviderOutcome<"accepted">>;
  absence(token: string, target: ProviderInspectTarget): Promise<ProviderOutcome<"present" | "absent">>;
}
