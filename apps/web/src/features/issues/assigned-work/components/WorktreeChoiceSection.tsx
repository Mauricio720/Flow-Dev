"use client";

import type { TaskDetail } from "../contract";
import { useWorktreeChoice } from "../hooks/useWorktreeChoice";
import type { WorktreeChoice } from "../worktreeContract";
import { LOCKED_NOTE, READER_PENDING_NOTE, WORKTREE_MODE_LABEL, WORKTREE_SECTION_TITLE } from "../worktreeCopy";
import { WorktreeChoiceForm } from "./WorktreeChoiceForm";

type Props = { detail: TaskDetail; canChoose: boolean; onSaved: () => Promise<void> | void };

function ChoiceSummary({ choice }: { choice: WorktreeChoice }) {
  if (choice.mode === null) return <p className="text-sm text-ink-2">{READER_PENDING_NOTE}</p>;
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium text-ink">{WORKTREE_MODE_LABEL[choice.mode]}{choice.mode === "worktree" && choice.branch && <> · <span className="font-mono text-[13px]">{choice.branch}</span></>}</p>
      {choice.locked && <p className="text-ink-3">{LOCKED_NOTE}</p>}
    </div>
  );
}

function ChoiceEditor({ detail, onSaved }: Omit<Props, "canChoose">) {
  const choice = detail.worktree;
  const form = useWorktreeChoice({ scope: { projectId: detail.task.projectId, taskId: detail.task.id }, saved: choice.mode, onSaved });
  return <WorktreeChoiceForm form={form} branch={choice.branch} chosen={choice.mode !== null} />;
}

export function WorktreeChoiceSection({ detail, canChoose, onSaved }: Props) {
  const editable = canChoose && !detail.worktree.locked;
  return (
    <section aria-label={WORKTREE_SECTION_TITLE} className="space-y-3 border-t border-line pt-4">
      <h3 className="text-[15px] font-semibold text-ink">{WORKTREE_SECTION_TITLE}</h3>
      {editable ? <ChoiceEditor detail={detail} onSaved={onSaved} /> : <ChoiceSummary choice={detail.worktree} />}
    </section>
  );
}
