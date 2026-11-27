import type { WorktreeChoiceState } from "../../database/dao/worktreeChoiceDao";
import type { WorktreeMode } from "../../worktrees/worktreeChoice";
import { effectiveChoice, worktreeBranchOf } from "./worktreeRules";

export type WorktreeChoiceView = { mode: WorktreeMode | null; locked: boolean; branch: string | null; chosenAt: string | null };

export function worktreeChoiceView(state: WorktreeChoiceState, issueNumber: number | null): WorktreeChoiceView {
  const choice = effectiveChoice(state);
  const branch = issueNumber === null ? null : worktreeBranchOf(issueNumber);
  return { mode: choice.mode, locked: choice.locked, branch, chosenAt: state.choice?.chosenAt.toISOString() ?? null };
}
