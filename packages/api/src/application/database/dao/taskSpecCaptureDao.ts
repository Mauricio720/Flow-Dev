import type { SpecStage } from "../../services/spec/specContracts";
import type { ManifestEntry } from "../../spec/specWorkspaceGateway";

export type SpecPackageDocumentDraft = { path: string; role: string; sourceText: string; byteCount: number; sha256: string; blocks: unknown[] };
export type SpecFinalizationDraft = { workspaceId: string; commandId: string | null; source: ManifestEntry[]; target: ManifestEntry[] };
export type SpecPackageDraft = {
  workflowId: string;
  attemptId: string;
  stage: SpecStage;
  manifestHash: string;
  captureState: "partial" | "prepared";
  parentPackageId: string | null;
  inputPackageIds: string[];
  diagnostics: unknown[];
  packageIndex: Record<string, unknown>;
  documents: SpecPackageDocumentDraft[];
};
export type SavedSpecPackage = { packageId: string; revision: number; captureState: string; created: boolean; finalizationId: string | null };

export interface TaskSpecCaptureDao {
  savePackage(draft: SpecPackageDraft, finalization?: SpecFinalizationDraft): Promise<SavedSpecPackage>;
}
