import { copyFile, lstat, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";

const ARTIFACT_DIRECTORY = ".flow-spec";
const SPEC_ACTION_KIND = "create_spec";
const TASKS_ACTION_KIND = "create_tasks";
const SPEC_ARTIFACT_NAMES = ["_spec.md", "_user_stories.md", "_dx.md", "_tests.md", "_uiux.md"];
const TASKS_MANIFEST = "_tasks.md";
const TASK_FILE = /^task_\d+\.md$/;
const DISCARDED_DIRECTORY = "discarded-artifacts";
const LEFTOVER_CAUSE = "A pasta .flow-spec do projeto já tem documentos que esta ação vai gerar, deixados por outra execução. Mova ou remova esses arquivos e tente de novo.";

type DiscardInput = { root: string; kind: string; runtimeRoot: string; runId: string; collectedPaths?: string[] };

async function presentArtifactNames(root: string, kind: string) {
  if (kind !== SPEC_ACTION_KIND && kind !== TASKS_ACTION_KIND) return [];
  const names = await readdir(join(root, ARTIFACT_DIRECTORY)).catch(() => [] as string[]);
  if (kind === SPEC_ACTION_KIND) return names.filter((name) => SPEC_ARTIFACT_NAMES.includes(name));
  return names.filter((name) => name === TASKS_MANIFEST || TASK_FILE.test(name));
}

export async function assertNoArtifactConflict(root: string, kind: string) {
  const names = await presentArtifactNames(root, kind);
  if (names.length) throw new LocalExecutionError("artifact_conflict", { cause: `${LEFTOVER_CAUSE} Arquivos encontrados: ${names.sort().join(", ")}.` });
}

async function preserveAndRemove(source: string, target: string) {
  const metadata = await lstat(source).catch(() => null);
  if (!metadata?.isFile()) return;
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await copyFile(source, target);
  await rm(source);
}

/** A run only starts with none of its artifacts present, so whatever exists when it ends was written by it; the folder is shared by every task of the checkout and must be left free for the next one. */
export async function discardRunArtifacts(input: DiscardInput) {
  const present = await presentArtifactNames(input.root, input.kind);
  const paths = [...new Set([...present, ...(input.collectedPaths ?? [])])];
  const destination = join(input.runtimeRoot, "runs", input.runId, DISCARDED_DIRECTORY);
  for (const path of paths) await preserveAndRemove(join(input.root, ARTIFACT_DIRECTORY, path), join(destination, path));
}
