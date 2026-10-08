import type { LocalCommand } from "../../application/services/local-execution/localProtocol";
import { removeApprovedSpecFiles } from "./localLoopTaskFiles";
import { discardRunArtifacts } from "./localRunArtifacts";

const TASKS_ACTION_KIND = "create_tasks";

type CleanupInput = { root: string; runtimeRoot: string; command: LocalCommand; collectedPaths?: string[] };

export async function cleanRunDocuments(input: CleanupInput) {
  if (input.command.kind !== "start") return;
  const kind = String(input.command.payload.snapshot.kind);
  await discardRunArtifacts({ root: input.root, kind, runtimeRoot: input.runtimeRoot, runId: input.command.runId, collectedPaths: input.collectedPaths }).catch(() => undefined);
  if (kind !== TASKS_ACTION_KIND) return;
  await removeApprovedSpecFiles({ root: input.root, files: input.command.payload.taskFiles ?? [] }).catch(() => undefined);
}
