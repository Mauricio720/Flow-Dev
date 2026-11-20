import type { CompozyGateway, CompozyWorktreeInput } from "../../compozy/compozyGateway";
import { TaskError } from "../tasks/taskErrors";

const BRANCH_CONFLICT = "worktree_branch_conflict";
type WorktreeGateway = Pick<CompozyGateway, "findWorktree" | "createWorktree">;

export async function resolveSpecWorktree(gateway: WorktreeGateway, input: CompozyWorktreeInput) {
  const existing = await gateway.findWorktree({ workspaceId: input.workspaceId, name: input.name });
  if (existing) return reuseWorktree(existing, input.branch);
  return gateway.createWorktree(input);
}

function reuseWorktree(existing: NonNullable<Awaited<ReturnType<WorktreeGateway["findWorktree"]>>>, expectedBranch: string) {
  if (existing.branch !== expectedBranch) throw new TaskError(BRANCH_CONFLICT);
  return { worktreeId: existing.worktreeId, path: existing.path };
}
