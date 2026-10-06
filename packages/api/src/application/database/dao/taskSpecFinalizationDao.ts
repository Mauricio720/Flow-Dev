import type { SpecReason, SpecStage } from "../../services/spec/specContracts";
import type { CandidateFile, ManifestEntry, PromotionStep } from "../../spec/specWorkspaceGateway";
import type { SpecClaim } from "./taskSpecWorkerDao";

export type LoadedSpecPackage = { id: string; workflowId: string; stage: SpecStage; attemptId: string; captureState: string; manifestHash: string; entries: ManifestEntry[]; files: CandidateFile[]; finalizationId: string | null };
export type CompleteFinalization = { finalizationId: string; packageId: string; installedManifestHash: string };

export interface TaskSpecFinalizationDao {
  loadPackage(packageId: string): Promise<LoadedSpecPackage>;
  priorEntries(workflowId: string, stage: SpecStage): Promise<ManifestEntry[]>;
  recordStep(finalizationId: string, step: PromotionStep): Promise<void>;
  markInstalled(finalizationId: string): Promise<void>;
  assertFinalizing(claim: SpecClaim): Promise<void>;
  complete(claim: SpecClaim, input: CompleteFinalization): Promise<void>;
  completeRestore(input: CompleteFinalization & { workflowId: string; stage: SpecStage }): Promise<void>;
  fail(finalizationId: string, reason: SpecReason): Promise<void>;
  beginRestore(input: { workflowId: string; workspaceId: string; packageId: string }): Promise<string>;
  workspaceFor(workflowId: string): Promise<string | null>;
}
