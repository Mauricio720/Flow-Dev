import type { SpecClaim } from "../database/dao/taskSpecWorkerDao";
import type { GitCredential, ManifestEntry } from "./specWorkspaceGateway";

export type SpecAccessState = "granted" | "revoked" | "unknown";
export interface SpecAccessProbe {
  check(claim: SpecClaim): Promise<SpecAccessState>;
  credential(claim: SpecClaim): Promise<GitCredential>;
  repository(claim: SpecClaim): Promise<{ owner: string; name: string; nodeId: string }>;
}
export type SpecUpstreamLoader = (claim: SpecClaim) => Promise<ManifestEntry[]>;
