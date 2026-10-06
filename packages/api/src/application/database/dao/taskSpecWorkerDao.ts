import type { SpecReason, SpecStage } from "../../services/spec/specContracts";
import type { ManifestEntry } from "../../spec/specWorkspaceGateway";
import type { InteractionDraft } from "../../services/spec/specInteractionRules";
import type { StoredSpecInput } from "../../services/spec/specInput";

export type SpecClaim = {
  attemptId: string;
  workflowId: string;
  projectId: string;
  taskId: string;
  authorUserId: string;
  stage: SpecStage;
  kind: string;
  state: string;
  input: StoredSpecInput;
  promptMessageId: string;
  promptIdempotencyKey: string;
  fence: number;
  runtimeWorkspaceId: string | null;
  runtimeSessionId: string | null;
  runtimeTurnId: string | null;
  runtimeCursor: string | null;
  stopRequestedAt: Date | null;
  terminalReason: string | null;
};
export type SpecWorkspaceBinding = { repositoryGithubId: string; repositoryNodeId: string; baseCommit: string; runnerId: string; checkoutLocator: string; slug: string };
export type SpecAttemptOutcome = { state: "failed" | "canceled" | "reconciling" | "stopping"; reason: SpecReason | null; attention?: string | null };
export type SpecEventDraft = { kind: string; payload: Record<string, unknown>; providerEventId?: string };

export type PendingDelivery = { interactionId: string; commandId: string; runtimeInteractionId: string; providerRequestId: string; runtimeTurnId: string; kind: "question" | "permission"; response: Record<string, unknown> };
export type DeliveryRecord = { delivery: "delivered" | "orphaned" | "unknown" | "pending" | "inactive"; reason: SpecReason | null; runtimeWinner?: string | null };

export type ApprovedUpstream = { packageId: string; manifestHash: string; stage: SpecStage; entries: ManifestEntry[] };

export interface TaskSpecWorkerDao {
  approvedUpstream(claim: SpecClaim): Promise<ApprovedUpstream[]>;
  workspaceId(claim: SpecClaim): Promise<string | null>;
  reviewedEntries(claim: SpecClaim): Promise<ManifestEntry[]>;
  saveInteraction(claim: SpecClaim, draft: InteractionDraft): Promise<{ id: string; created: boolean; status: string }>;
  markWaiting(claim: SpecClaim, kind: "question" | "permission"): Promise<void>;
  markRunning(claim: SpecClaim): Promise<void>;
  markFinalizing(claim: SpecClaim): Promise<void>;
  advanceCursor(claim: SpecClaim, sequence: number): Promise<void>;
  pendingDeliveries(claim: SpecClaim): Promise<PendingDelivery[]>;
  recordDelivery(claim: SpecClaim, input: { interactionId: string; commandId: string; record: DeliveryRecord }): Promise<void>;
  pendingInteractionCount(claim: SpecClaim): Promise<number>;
  claim(input: { owner: string; now: Date; maxActive: number }): Promise<SpecClaim | null>;
  heartbeat(claim: SpecClaim, now: Date): Promise<boolean>;
  release(claim: SpecClaim): Promise<void>;
  bindWorkspace(claim: SpecClaim, binding: SpecWorkspaceBinding): Promise<void>;
  bindSession(claim: SpecClaim, ids: { runtimeWorkspaceId: string; runtimeSessionId: string }): Promise<void>;
  markPromptAccepted(claim: SpecClaim, turnId: string | null): Promise<void>;
  requestStop(claim: SpecClaim, reason: SpecReason | null, now: Date): Promise<void>;
  setAttention(claim: SpecClaim, attention: string | null): Promise<void>;
  settle(claim: SpecClaim, outcome: SpecAttemptOutcome): Promise<void>;
  appendEvent(claim: SpecClaim, event: SpecEventDraft): Promise<number>;
  activeCount(): Promise<number>;
}
