import { sha256Hex } from "../services/spec/specPayload";
import type { SpecStage } from "../services/spec/specContracts";
import type { ManifestEntry, PackageIdentity } from "./specWorkspaceGateway";

export type StageManifestInput = { stage: SpecStage; bundleVersion: string; schemaVersion: number; upstream: PackageIdentity[]; entries: ManifestEntry[] };

function byPath(left: { path: string }, right: { path: string }) {
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
}

export function normalizedEntries(entries: ManifestEntry[]) {
  return [...entries].sort(byPath).map(({ path, role, sha256 }) => ({ path, role, sha256 }));
}

export function stageManifestHash(input: StageManifestInput) {
  const upstream = [...input.upstream].sort((left, right) => left.stage.localeCompare(right.stage)).map(({ stage, packageId, manifestHash }) => ({ stage, packageId, manifestHash }));
  return sha256Hex(JSON.stringify({ stage: input.stage, bundleVersion: input.bundleVersion, schemaVersion: input.schemaVersion, upstream, entries: normalizedEntries(input.entries) }));
}

export function installedManifestHash(entries: ManifestEntry[]) {
  return sha256Hex(JSON.stringify(normalizedEntries(entries)));
}
