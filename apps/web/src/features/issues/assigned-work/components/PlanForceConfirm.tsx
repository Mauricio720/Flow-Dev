import { Button } from "@/components/ui/button";
import { START_ANYWAY_LABEL, forceConfirmText } from "../planCopy";
import { CANCEL_LABEL } from "../terminalCopy";

type Props = { numbers: string[]; onConfirm: () => void; onCancel: () => void };

export function PlanForceConfirm({ numbers, onConfirm, onCancel }: Props) {
  return (
    <div role="alert" className="space-y-3 rounded-md border border-line bg-surface p-3">
      <p className="text-sm font-medium text-ink">{forceConfirmText(numbers)}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>{CANCEL_LABEL}</Button>
        <Button type="button" onClick={onConfirm}>{START_ANYWAY_LABEL}</Button>
      </div>
    </div>
  );
}
