"use client";

import { useState } from "react";
import type { IssueDraft, TaskRevision } from "../contract";
import { sameDraft, type DraftPath } from "../draftModel";

type Edit = { baseRevisionId: string; original: IssueDraft; draft: IssueDraft };

export function useDraftEditor(revision: TaskRevision) {
  const [edit, setEdit] = useState<Edit | null>(null);
  const [editing, setEditing] = useState(false);
  const changed = edit !== null && !sameDraft(edit.original, edit.draft) && !sameDraft(edit.draft, revision.draft);
  const active = changed ? edit : null;
  function change<Path extends DraftPath>(path: Path, value: IssueDraft[Path]) {
    const base = active ?? { baseRevisionId: revision.id, original: revision.draft, draft: revision.draft };
    setEdit({ ...base, draft: { ...base.draft, [path]: value } });
  }
  return {
    draft: active?.draft ?? revision.draft,
    dirty: active !== null,
    stale: active !== null && active.baseRevisionId !== revision.id,
    baseRevisionId: active?.baseRevisionId ?? revision.id,
    editing,
    setEditing,
    change,
    discard: () => setEdit(null),
    discardSaved: (saved: IssueDraft) => setEdit((current) => current && sameDraft(current.draft, saved) ? null : current),
    keepMine: () => active && setEdit({ ...active, baseRevisionId: revision.id, original: revision.draft }),
  };
}

export type DraftEditor = ReturnType<typeof useDraftEditor>;
