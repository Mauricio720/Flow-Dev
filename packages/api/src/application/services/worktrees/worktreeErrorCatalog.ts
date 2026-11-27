import type { TaskErrorReason } from "../tasks/taskErrors";

export const WORKTREE_REASONS = ["worktree_choice_required", "worktree_choice_locked", "worktree_folder_conflict", "worktree_branch_busy", "worktree_failed"] as const satisfies readonly TaskErrorReason[];

type WorktreeReason = (typeof WORKTREE_REASONS)[number];
type WorktreeErrorDetails = Record<string, string> | undefined;

const LOCKED_REASON: WorktreeReason = "worktree_choice_locked";

function isWorktreeReason(reason: string): reason is WorktreeReason {
  return (WORKTREE_REASONS as readonly string[]).includes(reason);
}

export function worktreeErrorCode(reason: string) {
  if (!isWorktreeReason(reason)) return undefined;
  return reason === LOCKED_REASON ? "CONFLICT" : "PRECONDITION_FAILED";
}

export function worktreeMessage(reason: string, details?: WorktreeErrorDetails): string | undefined {
  if (reason === "worktree_choice_required") return "Escolha onde trabalhar, com ou sem worktree, antes de iniciar a primeira sessão deste trabalho.";
  if (reason === LOCKED_REASON) return "A escolha de worktree fica fixa depois que a primeira sessão do trabalho abre.";
  if (reason === "worktree_folder_conflict") return `A pasta ${details?.path} já existe e não é o worktree deste trabalho. Mova ou apague essa pasta e tente de novo.`;
  if (reason === "worktree_branch_busy") return `A branch ${details?.branch} está em uso em ${details?.path}. Troque a branch dessa pasta e tente de novo.`;
  if (reason === "worktree_failed") return `Não foi possível preparar o worktree em ${details?.path}. Confira o clone vinculado e tente de novo.`;
  return undefined;
}
