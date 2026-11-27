import type { RouterInputs } from "@flow-dev/api";
import type { TaskDetail } from "./contract";
import type { TerminalCheckout, TerminalPreflight } from "./terminalContract";

export type WorktreeChoice = TaskDetail["worktree"];
export type WorktreeMode = RouterInputs["tasks"]["worktree"]["choose"]["mode"];
export type WorktreePreview = NonNullable<TerminalPreflight["worktree"]>;
export type WorktreeFolderPreview = Extract<WorktreePreview, { mode: "worktree" }>;
export type WorktreePreviewState = WorktreeFolderPreview["state"];
export type WorktreeBase = Pick<TerminalCheckout, "branch" | "detachedSha" | "dirty">;
