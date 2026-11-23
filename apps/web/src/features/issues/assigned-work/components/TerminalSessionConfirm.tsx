import { Button } from "@/components/ui/button";
import { CANCEL_LABEL, OPEN_ANOTHER_LABEL, SESSION_ACTIVE_MESSAGE } from "../terminalCopy";

type Props = { onConfirm: () => void; onCancel: () => void };

export function TerminalSessionConfirm({ onConfirm, onCancel }: Props) {
  return (
    <div role="alert" className="space-y-3 rounded-md border border-line bg-surface p-3">
      <p className="text-sm font-medium text-ink">{SESSION_ACTIVE_MESSAGE}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>{CANCEL_LABEL}</Button>
        <Button type="button" onClick={onConfirm}>{OPEN_ANOTHER_LABEL}</Button>
      </div>
    </div>
  );
}
