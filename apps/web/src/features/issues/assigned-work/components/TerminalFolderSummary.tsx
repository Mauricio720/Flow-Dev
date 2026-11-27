import type { TerminalCheckout } from "../terminalContract";
import type { WorktreePreview } from "../worktreeContract";
import { CHOICE_MISSING_IN_DIALOG } from "../worktreeCopy";
import { TerminalCheckoutSummary } from "./TerminalCheckoutSummary";
import { TerminalWorktreeSummary } from "./TerminalWorktreeSummary";

type Props = { checkout: TerminalCheckout | null; worktree: WorktreePreview | null; projectId: string };

export function TerminalFolderSummary({ checkout, worktree, projectId }: Props) {
  if (!checkout || !worktree || worktree.mode === "checkout") return <TerminalCheckoutSummary checkout={checkout} projectId={projectId} />;
  if (worktree.mode === null) return <p role="alert" className="text-sm text-destructive">{CHOICE_MISSING_IN_DIALOG}</p>;
  return <TerminalWorktreeSummary preview={worktree} checkout={checkout} />;
}
