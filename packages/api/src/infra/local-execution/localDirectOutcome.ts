import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DIRECT_OUTCOME_FILE, directFailureOf, type DirectFailure } from "../../application/services/local-execution/directOutcome";
import { DIRECT_ACTION_KIND } from "../../application/services/task-flow/directExecution";

const ARTIFACT_DIRECTORY = ".flow-spec";
const MAX_REPORT_BYTES = 64 * 1024;

export async function directRunFailure(root: string, actionKind: string): Promise<DirectFailure | null> {
  if (actionKind !== DIRECT_ACTION_KIND) return null;
  const report = await readFile(join(root, ARTIFACT_DIRECTORY, DIRECT_OUTCOME_FILE), "utf8").catch(() => null);
  return directFailureOf(report !== null && Buffer.byteLength(report) <= MAX_REPORT_BYTES ? report : null);
}
