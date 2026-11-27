import type { WorktreeFolderPreview, WorktreePreview } from "./worktreeContract";

const BLOCKING_STATES = new Set<WorktreeFolderPreview["state"]>(["conflict", "branch_busy"]);
const FROM_BASE_STATES = new Set<WorktreeFolderPreview["state"]>(["create", "restore_branch"]);

export function folderBlocked(preview: WorktreePreview | null | undefined) {
  if (!preview) return false;
  if (preview.mode === null) return true;
  return preview.mode === "worktree" && BLOCKING_STATES.has(preview.state);
}

export function startsFromBase(preview: WorktreeFolderPreview) {
  return FROM_BASE_STATES.has(preview.state);
}
