import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DirectFailure } from "../../application/services/local-execution/directOutcome";
import { PULL_REQUEST_OUTCOME_FILE, pullRequestFailureOf } from "../../application/services/local-execution/pullRequestOutcome";
import { PULL_REQUEST_ACTION_KIND } from "../../application/services/task-flow/pullRequestAction";

const ARTIFACT_DIRECTORY = ".flow-spec";
const MAX_REPORT_BYTES = 64 * 1024;

export async function pullRequestRunFailure(root: string, actionKind: string): Promise<DirectFailure | null> {
  if (actionKind !== PULL_REQUEST_ACTION_KIND) return null;
  const report = await readFile(join(root, ARTIFACT_DIRECTORY, PULL_REQUEST_OUTCOME_FILE), "utf8").catch(() => null);
  return pullRequestFailureOf(report !== null && Buffer.byteLength(report) <= MAX_REPORT_BYTES ? report : null);
}
