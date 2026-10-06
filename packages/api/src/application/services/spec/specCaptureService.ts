import type { SpecFinalizationDraft, TaskSpecCaptureDao } from "../../database/dao/taskSpecCaptureDao";
import { validateSpecPackage } from "../../spec/documents/validateSpecPackage";
import type { ReviewDiagnostic } from "../../spec/documents/specDocumentTypes";
import { stageManifestHash } from "../../spec/specManifest";
import type { CandidateManifest, PackageIdentity } from "../../spec/specWorkspaceGateway";
import type { SpecReason, SpecStage } from "./specContracts";

const INDEX_SCHEMA_VERSION = 1;
const BUNDLE_VERSION = "1";
const LIMIT_CODE = "package_limit";

export type CaptureInput = {
  workflowId: string;
  attemptId: string;
  stage: SpecStage;
  manifest: CandidateManifest;
  upstream: PackageIdentity[];
  approvedUpstream?: { path: string; sha256: string }[];
  parentPackageId?: string | null;
  bundleVersion?: string;
  finalization?: Omit<SpecFinalizationDraft, "target" | "source"> & { source?: SpecFinalizationDraft["source"] };
};

export class SpecCaptureService {
  constructor(private readonly dao: TaskSpecCaptureDao) {}

  async capture(input: CaptureInput) {
    const { manifest } = input;
    const documents = manifest.files.map((file) => ({ path: file.path, role: manifest.entries.find((entry) => entry.path === file.path)!.role, bytes: Buffer.from(file.content, "utf8") }));
    const validation = validateSpecPackage({ stage: input.stage, documents, approvedUpstream: input.approvedUpstream ?? [] });
    const manifestHash = stageManifestHash({ stage: input.stage, bundleVersion: input.bundleVersion ?? BUNDLE_VERSION, schemaVersion: INDEX_SCHEMA_VERSION, upstream: input.upstream, entries: manifest.entries });
    const blocksByPath = new Map(validation.parsed.map((document) => [document.path, document.blocks]));
    const draft = {
      workflowId: input.workflowId, attemptId: input.attemptId, stage: input.stage, manifestHash,
      captureState: validation.valid ? "prepared" as const : "partial" as const,
      parentPackageId: input.parentPackageId ?? null,
      inputPackageIds: input.upstream.map((identity) => identity.packageId),
      diagnostics: validation.diagnostics,
      packageIndex: validation.index ?? { schemaVersion: INDEX_SCHEMA_VERSION, stage: input.stage, documents: manifest.entries, upstream: input.upstream, stories: [], tests: [], tasks: [], decisions: [] },
      documents: manifest.files.map((file) => { const entry = manifest.entries.find((candidate) => candidate.path === file.path)!; return { path: file.path, role: entry.role, sourceText: file.content, byteCount: entry.bytes, sha256: entry.sha256, blocks: blocksByPath.get(file.path) ?? [] }; }),
    };
    const finalization = validation.valid && input.finalization ? { ...input.finalization, source: input.finalization.source ?? [], target: manifest.entries } : undefined;
    const saved = await this.dao.savePackage(draft, finalization);
    return { ...saved, manifestHash, reviewReady: false, valid: validation.valid, diagnostics: validation.diagnostics, reason: failureReason(validation.valid, validation.diagnostics) };
  }
}

function failureReason(valid: boolean, diagnostics: ReviewDiagnostic[]): SpecReason | null {
  if (valid) return null;
  return diagnostics.some((item) => item.code === LIMIT_CODE) ? "package_limit" : "artifact_invalid";
}
