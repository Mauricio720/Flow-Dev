import { basename, dirname, join } from "node:path";
import type { WorktreeChoiceState } from "../../database/dao/worktreeChoiceDao";
import { CHECKOUT_MODE, type WorktreeMode } from "../../worktrees/worktreeChoice";
import type { WorktreeInspection, WorktreeTarget } from "../../worktrees/worktreeManager";

const BRANCH_PREFIX = "flow/issue-";
const FOLDER_SUFFIX = "-worktrees";
const ISSUE_FOLDER_PREFIX = "issue-";

export type EffectiveWorktreeChoice = { mode: WorktreeMode | null; locked: boolean };
export type WorktreePreviewState = "ready" | "create" | "from_branch" | "restore_folder" | "restore_branch" | "conflict" | "branch_busy";

export function worktreeBranchOf(issueNumber: number) {
  return `${BRANCH_PREFIX}${issueNumber}`;
}

export function worktreePathOf(checkoutRoot: string, issueNumber: number) {
  return join(dirname(checkoutRoot), `${basename(checkoutRoot)}${FOLDER_SUFFIX}`, `${ISSUE_FOLDER_PREFIX}${issueNumber}`);
}

export function worktreeTargetOf(checkoutRoot: string, issueNumber: number): WorktreeTarget {
  return { checkoutRoot, path: worktreePathOf(checkoutRoot, issueNumber), branch: worktreeBranchOf(issueNumber) };
}

export function effectiveChoice(state: WorktreeChoiceState): EffectiveWorktreeChoice {
  if (state.choice) return { mode: state.choice.mode, locked: state.opened };
  return { mode: state.opened ? CHECKOUT_MODE : null, locked: state.opened };
}

export function previewStateOf(inspection: WorktreeInspection, locked: boolean): WorktreePreviewState {
  if (inspection.kind !== "missing") return inspection.kind;
  if (inspection.branchExists) return locked ? "restore_folder" : "from_branch";
  return locked ? "restore_branch" : "create";
}
