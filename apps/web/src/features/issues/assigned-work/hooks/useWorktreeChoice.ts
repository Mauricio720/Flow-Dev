"use client";

import { useState } from "react";
import { trpcData } from "@/lib/trpc/error";
import type { TerminalScope } from "../terminalContract";
import { chooseWorktree } from "../worktreeClient";
import type { WorktreeMode } from "../worktreeContract";
import { CHOICE_FAILED_MESSAGE } from "../worktreeCopy";

type Options = { scope: TerminalScope; saved: WorktreeMode | null; onSaved: () => Promise<void> | void };

function failureMessage(error: unknown) {
  const data = trpcData(error);
  return error instanceof Error && data && "reason" in data ? error.message : CHOICE_FAILED_MESSAGE;
}

export function useWorktreeChoice({ scope, saved, onSaved }: Options) {
  const [selected, setSelected] = useState<WorktreeMode | null>(saved);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    setFailure(null);
    try {
      await chooseWorktree(scope, selected);
      await onSaved();
    } catch (error) {
      setFailure(failureMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return { selected, setSelected, saving, failure, save, changed: selected !== null && selected !== saved };
}

export type WorktreeChoiceState = ReturnType<typeof useWorktreeChoice>;
