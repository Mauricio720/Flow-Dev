import type { SpecReason, SpecStage } from "../../services/spec/specContracts";
import type { ManifestEntry } from "../../spec/specWorkspaceGateway";

export type ApprovalClaim = { commandId: string; fence: number; workflowId: string; projectId: string; taskId: string; authorUserId: string; actorUserId: string; stage: SpecStage; packageId: string; manifestHash: string; entries: ManifestEntry[]; repositoryGithubId: string };

export interface TaskSpecApprovalDao {
  claim(input: { owner: string; now: Date; action?: "spec.approve" | "spec.returnToReview" }): Promise<ApprovalClaim | null>;
  markApplied(claim: ApprovalClaim): Promise<void>;
  apply(claim: ApprovalClaim, installedManifestHash: string): Promise<void>;
  reject(claim: ApprovalClaim, reason: SpecReason): Promise<void>;
  release(claim: ApprovalClaim): Promise<void>;
}
