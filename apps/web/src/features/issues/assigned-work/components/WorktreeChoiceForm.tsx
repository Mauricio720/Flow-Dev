"use client";

import { Button } from "@/components/ui/button";
import type { WorktreeChoiceState } from "../hooks/useWorktreeChoice";
import { CHOICE_REQUIRED_NOTE, SAVE_CHOICE_LABEL, SAVING_CHOICE_LABEL, WORKTREE_LEGEND, WORKTREE_MODE_LABEL, WORKTREE_MODE_ORDER, worktreeModeDescription } from "../worktreeCopy";

type Props = { form: WorktreeChoiceState; branch: string | null; chosen: boolean };

export function WorktreeChoiceForm({ form, branch, chosen }: Props) {
  return (
    <form onSubmit={(event) => { event.preventDefault(); void form.save(); }} className="space-y-3">
      <fieldset disabled={form.saving} className="space-y-2">
        <legend className="text-sm text-ink-2">{WORKTREE_LEGEND}</legend>
        {WORKTREE_MODE_ORDER.map((mode) => (
          <label key={mode} className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 text-sm has-[:checked]:border-ink-3">
            <input type="radio" name="worktree-mode" value={mode} checked={form.selected === mode} onChange={() => form.setSelected(mode)} className="mt-1 size-4 accent-primary" />
            <span className="space-y-0.5">
              <span className="block font-medium text-ink">{WORKTREE_MODE_LABEL[mode]}</span>
              <span className="block text-ink-2">{worktreeModeDescription(mode, branch)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {!chosen && <p className="text-sm text-ink-2">{CHOICE_REQUIRED_NOTE}</p>}
      {form.failure && <p role="alert" className="text-sm text-destructive">{form.failure}</p>}
      <Button type="submit" size="sm" disabled={!form.changed || form.saving}>{form.saving ? SAVING_CHOICE_LABEL : SAVE_CHOICE_LABEL}</Button>
    </form>
  );
}
