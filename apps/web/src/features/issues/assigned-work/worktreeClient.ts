import { trpc } from "@/lib/trpc/client";
import type { TerminalScope } from "./terminalContract";
import type { WorktreeMode } from "./worktreeContract";

export function chooseWorktree(scope: TerminalScope, mode: WorktreeMode) {
  return trpc.tasks.worktree.choose.mutate({ projectId: scope.projectId, taskId: scope.taskId, mode });
}
