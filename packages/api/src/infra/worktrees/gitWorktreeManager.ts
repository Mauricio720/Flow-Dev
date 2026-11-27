import { lstat, readdir } from "node:fs/promises";
import type { GitCheckoutInspector } from "../../application/terminal/gitCheckoutInspector";
import type { WorktreeEnsureResult, WorktreeFolder, WorktreeInspection, WorktreeManager, WorktreeTarget } from "../../application/worktrees/worktreeManager";
import { copyMissingEnvFiles } from "./worktreeEnvFiles";
import { addWorktree, branchCheckoutPath, branchExists, commonDirOf } from "./worktreeGit";

const CONFLICT = { kind: "conflict" } as const;
const FAILED = { kind: "failed" } as const;
const MISSING = { kind: "missing" } as const;

type FolderState = WorktreeFolder | typeof CONFLICT | typeof MISSING;

async function isEmptyDirectory(path: string) {
  return readdir(path).then((names) => names.length === 0, () => false);
}

export class GitWorktreeManager implements WorktreeManager {
  constructor(private readonly inspector: GitCheckoutInspector) {}

  async inspect(target: WorktreeTarget): Promise<WorktreeInspection> {
    const folder = await this.folderOf(target);
    if (folder.kind !== "missing") return folder;
    const busyPath = await branchCheckoutPath(target.checkoutRoot, { branch: target.branch, ownPath: target.path });
    if (busyPath) return { kind: "branch_busy", busyPath };
    return { kind: "missing", branchExists: await branchExists(target.checkoutRoot, target.branch) };
  }

  async ensure(target: WorktreeTarget): Promise<WorktreeEnsureResult> {
    const inspection = await this.inspect(target);
    if (inspection.kind === "conflict" || inspection.kind === "branch_busy") return inspection;
    if (inspection.kind === "missing") await addWorktree({ root: target.checkoutRoot, path: target.path, branch: target.branch, branchExists: inspection.branchExists });
    if ((await this.folderOf(target)).kind !== "ready") return FAILED;
    const copied = await copyMissingEnvFiles(target.checkoutRoot, target.path).then(() => true, () => false);
    if (!copied) return FAILED;
    const folder = await this.folderOf(target);
    return folder.kind === "ready" ? folder : FAILED;
  }

  private async folderOf(target: WorktreeTarget): Promise<FolderState> {
    const entry = await lstat(target.path).catch(() => null);
    if (!entry || (entry.isDirectory() && await isEmptyDirectory(target.path))) return MISSING;
    const inspection = await this.inspector.inspect(target.path);
    if (inspection.kind !== "repository") return CONFLICT;
    const [own, source] = await Promise.all([commonDirOf(inspection.root), commonDirOf(target.checkoutRoot)]);
    if (own === null || own !== source) return CONFLICT;
    return { kind: "ready", path: inspection.root, branch: inspection.branch, detachedSha: inspection.detachedSha, dirty: inspection.dirty };
  }
}
