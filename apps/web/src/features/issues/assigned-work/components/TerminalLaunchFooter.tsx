import { Button } from "@/components/ui/button";
import type { TerminalAttachments } from "../hooks/useTerminalAttachments";
import type { TerminalLaunch } from "../hooks/useTerminalLaunch";
import { CANCEL_LABEL, SENDING_LABEL, TERMINAL_ACTION_LABEL } from "../terminalCopy";

type Props = { launch: TerminalLaunch; attachments: TerminalAttachments; onClose: () => void; onConfirm: () => void };

export function TerminalLaunchFooter({ launch, attachments, onClose, onConfirm }: Props) {
  const sending = launch.phase === "sending";
  const blocked = sending || launch.promptProblem !== null || attachments.uploading;
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {!sending && <Button type="button" variant="outline" onClick={onClose}>{CANCEL_LABEL}</Button>}
      {launch.preflight?.checkout && <Button type="button" disabled={blocked} onClick={onConfirm}>{sending ? SENDING_LABEL : TERMINAL_ACTION_LABEL}</Button>}
    </div>
  );
}
