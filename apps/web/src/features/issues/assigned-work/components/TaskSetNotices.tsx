import { manifestProblemNote, otherFolderNote } from "../taskSetCopy";
import type { TaskSetData } from "../taskSetContract";

export function TaskSetNotices({ set }: { set: TaskSetData }) {
  return (
    <>
      {set.problem !== null ? <p role="status" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-destructive">{manifestProblemNote(set.problem)}</p> : null}
      {set.otherFolders.map((folder) => <p key={folder} role="status" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-2 [overflow-wrap:anywhere]">{otherFolderNote(folder)}</p>)}
    </>
  );
}
