import type { WorktreeInfo } from "../../software/compozyControlGateway";
import { TaskFlowError } from "./taskFlowErrors";

export type WorktreeUseCheck = {
  worktree: WorktreeInfo | null;
  taskWorkspaceId: string;
  otherActiveWriteRuns: number;
  writable: boolean;
};

const READY_STATE = "ready";

export class WorktreePolicy {
  assertUsable(check: WorktreeUseCheck) {
    const { worktree } = check;
    if (!worktree) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "missing" });
    if (worktree.state !== READY_STATE) throw new TaskFlowError("worktree_not_ready", undefined, { cause: worktree.state });
    if (worktree.workspaceId !== check.taskWorkspaceId) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "foreign_repository" });
    if (worktree.dirty) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "dirty" });
    if (check.writable && check.otherActiveWriteRuns > 0) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "busy" });
  }
}
