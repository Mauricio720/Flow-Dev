import type { SpecStage } from "../services/spec/specContracts";

export type PackageIdentity = { packageId: string; manifestHash: string; stage: SpecStage };
export type ManifestEntry = { path: string; role: string; sha256: string; bytes: number };
export type AttemptIdentity = { taskId: string; repositoryGithubId: string; attemptId: string; stage: SpecStage };
export type WorkspaceIdentity = { taskId: string; repositoryGithubId: string };
export type GitCredential = { username: string; password: string };
export type PrepareSpecWorkspace = { taskId: string; repositoryGithubId: string; owner: string; name: string; pinnedCommit: string | null; credential: GitCredential };
export type SpecWorkspace = { slug: string; checkoutPath: string; baseCommit: string };
export type CandidateWorkspace = { candidatePath: string; inputsPath: string; scratchPath: string; snapshotPath: string };
export type CandidateFile = { path: string; content: string };
export type CandidateManifest = { stage: SpecStage; entries: ManifestEntry[]; files: CandidateFile[]; complete: boolean; missing: string[] };
export type InstalledManifest = { entries: ManifestEntry[]; manifestHash: string };
export type PromoteSpecPackage = AttemptIdentity & { manifest: CandidateManifest; expectedPrior: ManifestEntry[]; journal: PromotionJournal };
export type VerifySpecPackage = WorkspaceIdentity & { expected: ManifestEntry[] };
export type PromotionStep = { path: string; expectedPriorHash: string | null; targetHash: string; phase: "pending" | "installed" };
export interface PromotionJournal { record(step: PromotionStep): Promise<void> }

export interface SpecWorkspaceGateway {
  prepare(input: PrepareSpecWorkspace): Promise<SpecWorkspace>;
  candidate(input: AttemptIdentity & { upstream: ManifestEntry[]; previous: ManifestEntry[] }): Promise<CandidateWorkspace>;
  freeze(input: AttemptIdentity): Promise<CandidateManifest>;
  inspect(input: WorkspaceIdentity): Promise<InstalledManifest>;
  promote(input: PromoteSpecPackage): Promise<InstalledManifest>;
  verify(input: VerifySpecPackage): Promise<InstalledManifest>;
}
