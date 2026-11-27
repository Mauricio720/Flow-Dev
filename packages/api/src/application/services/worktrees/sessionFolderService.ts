import type { WorktreeChoiceDao } from "../../database/dao/worktreeChoiceDao";
import { CHECKOUT_MODE, WORKTREE_MODE } from "../../worktrees/worktreeChoice";
import type { WorktreeEnsureResult, WorktreeInspection, WorktreeManager, WorktreeTarget } from "../../worktrees/worktreeManager";
import type { VerifiedCheckout } from "../projects/localCheckoutService";
import { TaskError } from "../tasks/taskErrors";
import { effectiveChoice, previewStateOf, worktreeTargetOf, type WorktreePreviewState } from "./worktreeRules";

export type SessionFolderDeps = { choices: Pick<WorktreeChoiceDao, "state">; worktrees: WorktreeManager };
export type SessionFolderInput = { taskId: string; issueNumber: number; checkout: VerifiedCheckout };
export type SessionFolderPreviewInput = Omit<SessionFolderInput, "checkout"> & { checkout: VerifiedCheckout | null };
export type WorktreePreviewFolder = { mode: typeof WORKTREE_MODE; path: string; branch: string | null; detachedSha: string | null; state: WorktreePreviewState; dirty: boolean; busyPath: string | null };
export type WorktreePreview = { mode: null } | { mode: typeof CHECKOUT_MODE } | WorktreePreviewFolder;

function problemError(result: Exclude<WorktreeEnsureResult, { kind: "ready" }>, target: WorktreeTarget) {
  if (result.kind === "conflict") return new TaskError("worktree_folder_conflict", { path: target.path });
  if (result.kind === "branch_busy") return new TaskError("worktree_branch_busy", { branch: target.branch, path: result.busyPath });
  return new TaskError("worktree_failed", { path: target.path });
}

function previewFolder(target: WorktreeTarget, inspection: WorktreeInspection, locked: boolean): WorktreePreviewFolder {
  const ready = inspection.kind === "ready" ? inspection : null;
  const busyPath = inspection.kind === "branch_busy" ? inspection.busyPath : null;
  return { mode: WORKTREE_MODE, path: target.path, branch: ready ? ready.branch : target.branch, detachedSha: ready?.detachedSha ?? null, state: previewStateOf(inspection, locked), dirty: ready?.dirty ?? false, busyPath };
}

export class SessionFolderService {
  constructor(private readonly deps: SessionFolderDeps) {}

  async resolve(input: SessionFolderInput): Promise<VerifiedCheckout> {
    const choice = effectiveChoice(await this.deps.choices.state(input.taskId));
    if (choice.mode === null) throw new TaskError("worktree_choice_required");
    if (choice.mode === CHECKOUT_MODE) return input.checkout;
    const target = worktreeTargetOf(input.checkout.path, input.issueNumber);
    const result = await this.deps.worktrees.ensure(target);
    if (result.kind !== "ready") throw problemError(result, target);
    return { path: result.path, branch: result.branch, detachedSha: result.detachedSha, dirty: result.dirty };
  }

  async preview(input: SessionFolderPreviewInput): Promise<WorktreePreview | null> {
    if (!input.checkout) return null;
    const choice = effectiveChoice(await this.deps.choices.state(input.taskId));
    if (choice.mode === null) return { mode: null };
    if (choice.mode === CHECKOUT_MODE) return { mode: CHECKOUT_MODE };
    const target = worktreeTargetOf(input.checkout.path, input.issueNumber);
    return previewFolder(target, await this.deps.worktrees.inspect(target), choice.locked);
  }
}
