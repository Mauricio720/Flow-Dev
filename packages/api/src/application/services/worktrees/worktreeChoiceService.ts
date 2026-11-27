import type { TerminalSessionDao } from "../../database/dao/terminalSessionDao";
import type { WorktreeChoiceDao } from "../../database/dao/worktreeChoiceDao";
import type { WorktreeMode } from "../../worktrees/worktreeChoice";
import { TaskError } from "../tasks/taskErrors";
import { worktreeChoiceView } from "./worktreeChoiceView";

export type WorktreeChoiceDeps = { choices: WorktreeChoiceDao; plannings: Pick<TerminalSessionDao, "approvedPlanning">; clock?: () => Date };
export type ChooseWorktreeInput = { taskId: string; actorId: string; mode: WorktreeMode };

export class WorktreeChoiceService {
  private readonly clock: () => Date;

  constructor(private readonly deps: WorktreeChoiceDeps) {
    this.clock = deps.clock ?? (() => new Date());
  }

  async choose(input: ChooseWorktreeInput) {
    const planning = await this.deps.plannings.approvedPlanning(input.taskId);
    if (!planning) throw new TaskError("planning_not_approved");
    const saved = await this.deps.choices.saveBeforeFirstSession({ ...input, at: this.clock() });
    if (!saved) throw new TaskError("worktree_choice_locked");
    return worktreeChoiceView(await this.deps.choices.state(input.taskId), planning.issue.number);
  }
}
