import type { TerminalCheckout } from "../terminalContract";
import { DIRTY_WARNING, branchLabel } from "../terminalCopy";
import type { WorktreeFolderPreview } from "../worktreeContract";
import { BASE_DIRTY_WARNING, WORKTREE_FOLDER_LABEL, worktreeStateNote } from "../worktreeCopy";
import { folderBlocked, startsFromBase } from "../worktreeModel";

type Props = { preview: WorktreeFolderPreview; checkout: TerminalCheckout };

export function TerminalWorktreeSummary({ preview, checkout }: Props) {
  const note = worktreeStateNote(preview, checkout);
  const blocked = folderBlocked(preview);
  return (
    <div className="space-y-2">
      <dl className="grid gap-1 text-sm sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-x-4">
        <dt className="text-ink-3">{WORKTREE_FOLDER_LABEL}</dt>
        <dd className="font-mono text-[13px] [overflow-wrap:anywhere]">{preview.path}</dd>
        <dt className="sr-only">Branch</dt>
        <dd className="sm:col-start-2">{branchLabel(preview.branch, preview.detachedSha)}</dd>
      </dl>
      {note && <p role={blocked ? "alert" : "status"} className={`text-sm ${blocked ? "text-destructive" : "text-ink-2"}`}>{note}</p>}
      {startsFromBase(preview) && checkout.dirty && <p role="status" className="text-sm text-ink-2">{BASE_DIRTY_WARNING}</p>}
      {preview.state === "ready" && preview.dirty && <p role="status" className="text-sm text-ink-2">{DIRTY_WARNING}</p>}
    </div>
  );
}
