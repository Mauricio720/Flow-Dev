import type { PackageFormat, PackageStore } from "../../database/dao/unifiedPackageDao";
import { ARTIFACT_MAX_FILES, isSafeArtifact } from "./localArtifacts";

const LOOP_FORMATS: PackageFormat[] = ["os_spec_v1", "os_tasks_v1"];
const SPEC_FORMATS: PackageFormat[] = ["os_spec_v1"];

export type LoopTaskFile = { path: string; content: string };
type ApprovedPackages = Pick<PackageStore, "list" | "files">;

/** The approved spec and task documents a Loop reads from the checkout, or null when either is missing or unsafe to send. */
export function approvedLoopFiles(packages: ApprovedPackages, taskId: string) {
  return approvedFiles(packages, taskId, LOOP_FORMATS);
}

/** The approved spec a task breakdown reads from the checkout, or null when it is missing or unsafe to send. */
export function approvedSpecFiles(packages: ApprovedPackages, taskId: string) {
  return approvedFiles(packages, taskId, SPEC_FORMATS);
}

async function approvedFiles(packages: ApprovedPackages, taskId: string, formats: PackageFormat[]): Promise<LoopTaskFile[] | null> {
  const listed = await packages.list(taskId);
  const files = new Map<string, LoopTaskFile>();
  for (const format of formats) {
    const approved = listed.find((item) => item.format === format && item.approvedAt !== null);
    if (!approved) return null;
    for (const file of await packages.files(approved.id)) files.set(file.path, { path: file.path, content: file.sourceText });
  }
  const collected = [...files.values()];
  return collected.length <= ARTIFACT_MAX_FILES && collected.every(isSafeArtifact) ? collected : null;
}
