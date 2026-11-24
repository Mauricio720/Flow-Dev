import { Button } from "@/components/ui/button";
import { REGENERATE_CONFIRM_LABEL, regenerateConfirmText } from "../agentChoiceCopy";
import { CANCEL_LABEL } from "../terminalCopy";

type Props = { folder: string; onConfirm: () => void; onCancel: () => void };

export function RegenerateTasksConfirm({ folder, onConfirm, onCancel }: Props) {
  return (
    <div role="alert" className="space-y-3 rounded-md border border-line bg-surface p-3">
      <p className="text-sm font-medium text-ink">{regenerateConfirmText(folder)}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>{CANCEL_LABEL}</Button>
        <Button type="button" onClick={onConfirm}>{REGENERATE_CONFIRM_LABEL}</Button>
      </div>
    </div>
  );
}
