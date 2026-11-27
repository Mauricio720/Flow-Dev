import { Button } from "@/components/ui/button";
import type { TerminalAttachments } from "../hooks/useTerminalAttachments";
import type { TerminalLaunch } from "../hooks/useTerminalLaunch";
import { TerminalSessionConfirm } from "./TerminalSessionConfirm";
import { CANCEL_LABEL, SENDING_LABEL, TERMINAL_ACTION_LABEL } from "../terminalCopy";

type Props = { launch: TerminalLaunch; attachments: TerminalAttachments; onClose: () => void; onConfirm: () => void; onConfirmAdditional: () => void };

export function TerminalLaunchFooter({ launch, attachments, onClose, onConfirm, onConfirmAdditional }: Props) {
  if (launch.needsConfirmation) return <TerminalSessionConfirm onConfirm={onConfirmAdditional} onCancel={launch.declineAdditional} />;
  const sending = launch.phase === "sending";
  const blocked = sending || launch.promptProblem !== null || launch.agentProblem !== null || launch.folderProblem || attachments.uploading;
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {!sending && <Button type="button" variant="outline" onClick={onClose}>{CANCEL_LABEL}</Button>}
      {launch.preflight?.checkout && launch.serviceRunning && <Button type="button" disabled={blocked} onClick={onConfirm}>{sending ? SENDING_LABEL : TERMINAL_ACTION_LABEL}</Button>}
    </div>
  );
}
