import type { ClaimState, ActiveWorkItem } from "../../services/assigned-issues/assignedIssueContracts";
import type { Page } from "./projectDao";
import type { ResolvedSource, SourceFacts } from "./issueSourceDao";

export type ClaimBoard = { boardNodeId: string; boardItemId: string; statusFieldId: string; optionId: string };
export type ClaimRecord = ClaimBoard & { id: string; sourceId: string; taskId: string; projectId: string; candidateUserId: string; operatorUserId: string | null; state: ClaimState; revision: number; fence: number; sourceSnapshotId: string; reason: string | null; lastVerifiedAt: Date | null; claimedAt: Date | null };
export type AttemptKind = "claim" | "reconcile";
export type AttemptRecord = { id: string; sourceId: string; projectId: string; claimantUserId: string; kind: AttemptKind; requestKey: string; payloadHash: string; state: string; fence: number; dispatchStartedAt: Date | null; readBackStatus: string | null; failureCode: string | null; createdAt: Date };
export type ReserveInput = { source: SourceFacts; claimantUserId: string; requestKey: string; payloadHash: string; board: ClaimBoard };
export type ReserveOutcome = { kind: "reserved"; source: ResolvedSource; claim: ClaimRecord; attempt: AttemptRecord } | { kind: "held"; claim: ClaimRecord };
export type SettleOutcome = "claimed" | "failed" | "uncertain";
export type SettleInput = { attemptId: string; fence: number; outcome: SettleOutcome; reason: string | null; readBackStatus: string | null; at: Date };
export type ReconcileRecord = { sourceId: string; projectId: string; claimantUserId: string; requestKey: string; payloadHash: string; fence: number };
export type UnresolvedClaim = { claim: ClaimRecord; attempt: AttemptRecord };
export type ActiveQuery = { projectId: string; operatorUserId: string | null; limit: number; after: { claimedAt: string; id: string } | null };

export interface IssueClaimDao {
  reserve(input: ReserveInput): Promise<ReserveOutcome>;
  beginDispatch(input: { attemptId: string; fence: number; at: Date }): Promise<boolean>;
  settle(input: SettleInput): Promise<ClaimRecord>;
  attemptByKey(claimantUserId: string, projectId: string, requestKey: string): Promise<AttemptRecord | null>;
  recordReconcile(input: ReconcileRecord): Promise<void>;
  claimByTask(projectId: string, taskId: string): Promise<ClaimRecord | null>;
  claimBySource(sourceId: string): Promise<ClaimRecord | null>;
  unresolvedAttempt(sourceId: string): Promise<AttemptRecord | null>;
  unresolved(limit: number): Promise<UnresolvedClaim[]>;
  active(query: ActiveQuery): Promise<Page<ActiveWorkItem> & { lastKey: { claimedAt: string; id: string } | null }>;
}
