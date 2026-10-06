import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SpecStage } from "../src/application/services/spec/specContracts";
import { documentRole } from "../src/application/spec/specStageDocuments";
import type { CandidateManifest } from "../src/application/spec/specWorkspaceGateway";
import { sha256Of } from "../src/infra/spec/workspace/fileHash";
import { defaultBundleDirectory } from "../src/infra/spec/specBundleLoader";

export type FixtureRoute = "prd-route" | "tech-spec-route";

export function fixtureFiles(route: FixtureRoute, stage: SpecStage) {
  const directory = join(defaultBundleDirectory(), "fixtures", route, stage);
  return Object.fromEntries(readdirSync(directory).map((name) => [name, readFileSync(join(directory, name), "utf8")]));
}

export function manifestOf(files: Record<string, string>, stage: SpecStage): CandidateManifest {
  const entries = Object.entries(files).sort(([left], [right]) => (left < right ? -1 : 1)).map(([path, content]) => ({ path, role: documentRole(path), sha256: sha256Of(content), bytes: Buffer.byteLength(content) }));
  return { stage, entries, files: entries.map((entry) => ({ path: entry.path, content: files[entry.path]! })), complete: true, missing: [] };
}

export const fixtureManifest = (route: FixtureRoute, stage: SpecStage, overrides: Record<string, string> = {}) => manifestOf({ ...fixtureFiles(route, stage), ...overrides }, stage);

export function revisedManifest(route: FixtureRoute, stage: SpecStage, overrides: Record<string, string>, mutateIndex?: (index: Record<string, unknown>) => void) {
  const files = { ...fixtureFiles(route, stage), ...overrides };
  const indexName = `.flow-spec-${stage}.json`;
  const index = JSON.parse(files[indexName]!);
  mutateIndex?.(index);
  index.documents = Object.entries(files).filter(([path]) => path !== indexName).map(([path, content]) => ({ path, role: documentRole(path), sha256: sha256Of(content), sourceBytes: Buffer.byteLength(content) }));
  return manifestOf({ ...files, [indexName]: JSON.stringify(index) }, stage);
}
