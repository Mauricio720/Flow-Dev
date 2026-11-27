export const WORKTREE_MODE = "worktree";
export const CHECKOUT_MODE = "checkout";
export const WORKTREE_MODES = [WORKTREE_MODE, CHECKOUT_MODE] as const;

export type WorktreeMode = (typeof WORKTREE_MODES)[number];
