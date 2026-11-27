import type { WorktreeMode } from "../../worktrees/worktreeChoice";

export type WorktreeChoiceRecord = { mode: WorktreeMode; chosenByUserId: string; chosenAt: Date };
export type WorktreeChoiceState = { choice: WorktreeChoiceRecord | null; opened: boolean };
export type SaveWorktreeChoice = { taskId: string; mode: WorktreeMode; actorId: string; at: Date };

export interface WorktreeChoiceDao {
  state(taskId: string): Promise<WorktreeChoiceState>;
  saveBeforeFirstSession(input: SaveWorktreeChoice): Promise<boolean>;
}
