import { Button } from "@/components/ui/button";
import type { PlanView } from "../planContract";
import { adoptFolderLabel, folderChangeText } from "../planCopy";

type Props = { change: NonNullable<PlanView["folderChange"]>; canEdit: boolean; busy: boolean; onAdopt: () => void };

export function PlanFolderChange({ change, canEdit, busy, onAdopt }: Props) {
  return (
    <div className="space-y-2 rounded-xl border border-line bg-surface px-4 py-3">
      <p role="status" className="text-sm text-ink-2">{folderChangeText(change.from, change.to)}</p>
      {canEdit ? <Button type="button" size="sm" disabled={busy} onClick={onAdopt}>{adoptFolderLabel(change.to)}</Button> : null}
    </div>
  );
}
