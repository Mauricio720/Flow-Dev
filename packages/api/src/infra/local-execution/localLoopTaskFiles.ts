import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import type { LoopTaskFile } from "../../application/services/local-execution/loopTaskFiles";

const TASKS_DIRECTORY = [".compozy", "tasks"];
const SPEC_DIRECTORY = [".flow-spec"];
const SPEC_CONFLICT_CAUSE = "A pasta .flow-spec do projeto tem documentos diferentes da spec aprovada desta tarefa. Mova ou remova esses arquivos e tente de novo.";
const MISSING_FILES_CAUSE = "Os documentos aprovados da spec e das tarefas não chegaram ao conector. Inicie a ação novamente.";
const UNSAFE_DIRECTORY_CAUSE = "A pasta .compozy/tasks do projeto não é uma pasta comum. Remova o link simbólico e tente de novo.";

type InstallInput = { root: string; taskId: string; files: LoopTaskFile[] };

async function ensurePlainDirectory(path: string) {
  await mkdir(path, { recursive: true });
  const metadata = await lstat(path);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new LocalExecutionError("artifact_conflict", { cause: UNSAFE_DIRECTORY_CAUSE });
}

async function ensureTaskDirectory(root: string, relativeParts: string[]) {
  for (let depth = 1; depth <= relativeParts.length; depth += 1) await ensurePlainDirectory(join(root, ...relativeParts.slice(0, depth)));
}

function isExisting(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

/** Places the approved documents where the Loop reads them; files already there keep the progress a previous attempt recorded. */
export async function installLoopTaskFiles(input: InstallInput) {
  if (!input.files.length) throw new LocalExecutionError("artifact_conflict", { cause: MISSING_FILES_CAUSE });
  const taskParts = [...TASKS_DIRECTORY, input.taskId];
  for (const file of input.files) {
    const fileParts = file.path.split("/");
    await ensureTaskDirectory(input.root, [...taskParts, ...fileParts.slice(0, -1)]);
    const target = join(input.root, ...taskParts, ...fileParts);
    await writeFile(target, file.content, { flag: "wx" }).catch((error: unknown) => { if (!isExisting(error)) throw error; });
  }
}

async function writeApproved(target: string, content: string) {
  try { await writeFile(target, content, { flag: "wx" }); }
  catch (error) {
    if (!isExisting(error)) throw error;
    if ((await readFile(target, "utf8")) !== content) throw new LocalExecutionError("artifact_conflict", { cause: SPEC_CONFLICT_CAUSE });
  }
}

/** Places the approved spec where the task breakdown reads it; a different document already there belongs to other work and is never overwritten. */
export async function installApprovedSpecFiles(input: { root: string; files: LoopTaskFile[] }) {
  for (const file of input.files) {
    const fileParts = file.path.split("/");
    await ensureTaskDirectory(input.root, [...SPEC_DIRECTORY, ...fileParts.slice(0, -1)]);
    await writeApproved(join(input.root, ...SPEC_DIRECTORY, ...fileParts), file.content);
  }
}

/** Removes the approved spec once the task breakdown ends; a file that no longer matches was changed by other work and stays. */
export async function removeApprovedSpecFiles(input: { root: string; files: LoopTaskFile[] }) {
  for (const file of input.files) {
    const target = join(input.root, ...SPEC_DIRECTORY, ...file.path.split("/"));
    const content = await readFile(target, "utf8").catch(() => null);
    if (content === file.content) await rm(target);
  }
}
