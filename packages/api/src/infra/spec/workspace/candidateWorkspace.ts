import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { TaskError } from "../../../application/services/tasks/taskErrors";
import type { CandidateWorkspace, ManifestEntry } from "../../../application/spec/specWorkspaceGateway";
import { attemptPaths, type CheckoutPlan } from "./checkoutPlan";
import { hashFileIfPresent } from "./fileHash";

type Input = { plan: CheckoutPlan; attemptId: string; upstream: ManifestEntry[]; previous: ManifestEntry[] };

export async function buildCandidateWorkspace(input: Input): Promise<CandidateWorkspace> {
  const paths = attemptPaths(input.plan, input.attemptId);
  await rm(paths.base, { recursive: true, force: true });
  await Promise.all([mkdir(paths.candidatePath, { recursive: true }), mkdir(paths.inputsPath, { recursive: true }), mkdir(paths.scratchPath, { recursive: true })]);
  await copyVerified(input.plan.canonicalPath, paths.inputsPath, input.upstream);
  await copyVerified(input.plan.canonicalPath, paths.candidatePath, input.previous);
  return { candidatePath: paths.candidatePath, inputsPath: paths.inputsPath, scratchPath: paths.scratchPath, snapshotPath: paths.snapshotPath };
}

async function copyVerified(source: string, target: string, entries: ManifestEntry[]) {
  for (const entry of entries) {
    const origin = join(source, entry.path);
    if ((await hashFileIfPresent(origin)) !== entry.sha256) throw new TaskError("artifact_conflict");
    const destination = join(target, entry.path);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(origin, destination);
  }
}
