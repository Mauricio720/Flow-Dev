import { mkdir, lstat, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TaskFlowDao, RunRecord } from "../../application/database/dao/taskFlowDao";
import type { PackageFileRecord, PackageFormat } from "../../application/database/dao/unifiedPackageDao";
import type { RunWorkspaceProvider } from "./runWorkspaceProvider";
import { TaskError } from "../../application/services/tasks/taskErrors";

const SAFE_FILE = /^(?:_[a-z_]+|task_\d+)\.md$|^adrs\/adr-\d{3}\.md$/;

async function ensureDirectory(path: string) {
  await mkdir(path, { recursive: true });
  const metadata = await lstat(path);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new TaskError("artifact_conflict");
}

async function writeExact(root: string, file: PackageFileRecord) {
  if (!SAFE_FILE.test(file.path)) throw new TaskError("artifact_conflict");
  const target = join(root, file.path);
  await ensureDirectory(dirname(target));
  try { await writeFile(target, file.sourceText, { flag: "wx" }); }
  catch {
    const current = await readFile(target, "utf8").catch(() => null);
    if (current !== file.sourceText) throw new TaskError("artifact_conflict");
  }
}

export class ApprovedArtifactInstaller {
  constructor(private readonly flow: TaskFlowDao, private readonly workspaces: RunWorkspaceProvider) {}

  async install(run: RunRecord) {
    const { repositoryPath } = await this.workspaces.prepare({ run, snapshot: run.snapshot as never, grants: [] });
    const packages = await this.flow.packages.list(run.taskId);
    const find = (format: PackageFormat) => packages.find((item) => item.format === format && item.approvedAt !== null);
    const spec = find("os_spec_v1");
    if (!spec) throw new TaskError("artifact_conflict");
    if (run.snapshot.kind === "create_tasks") {
      const root = join(repositoryPath, ".flow-spec");
      await ensureDirectory(root);
      for (const file of await this.flow.packages.files(spec.id)) await writeExact(root, file);
      return;
    }
    const tasks = find("os_tasks_v1");
    if (!tasks) throw new TaskError("artifact_conflict");
    const root = join(repositoryPath, ".compozy", "tasks", run.taskId);
    await ensureDirectory(join(repositoryPath, ".compozy"));
    await ensureDirectory(join(repositoryPath, ".compozy", "tasks"));
    await ensureDirectory(root);
    for (const item of [spec, tasks]) for (const file of await this.flow.packages.files(item.id)) await writeExact(root, file);
  }
}
