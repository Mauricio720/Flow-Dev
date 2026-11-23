import type { TerminalAttachments } from "../hooks/useTerminalAttachments";
import type { TerminalLaunch } from "../hooks/useTerminalLaunch";
import { LOADING_MESSAGE, PREFLIGHT_FAILED_MESSAGE, SERVICE_OFFLINE_MESSAGE } from "../terminalCopy";
import { PermissionModeField } from "./PermissionModeField";
import { AttachmentPicker } from "./AttachmentPicker";
import { AttachmentsPreview } from "./AttachmentsPreview";
import { TerminalCheckoutSummary } from "./TerminalCheckoutSummary";
import { TerminalPromptField } from "./TerminalPromptField";

type Props = { launch: TerminalLaunch; projectId: string; attachments: TerminalAttachments };

export function TerminalLaunchBody({ launch, projectId, attachments }: Props) {
  const { preflight } = launch;
  const checkout = preflight?.checkout ?? null;
  return (
    <>
      {launch.phase === "loading" && <p role="status" className="text-sm text-ink-2">{LOADING_MESSAGE}</p>}
      {launch.phase === "load_failed" && <p role="alert" className="text-sm text-destructive">{PREFLIGHT_FAILED_MESSAGE}</p>}
      {preflight && !launch.serviceRunning && <p role="alert" className="text-sm text-destructive">{SERVICE_OFFLINE_MESSAGE}</p>}
      {preflight && <TerminalCheckoutSummary checkout={checkout} projectId={projectId} />}
      {preflight && checkout && launch.serviceRunning && <PermissionModeField value={launch.permissionMode} disabled={launch.phase === "sending"} onChange={launch.setPermissionMode} />}
      {preflight && checkout && <TerminalPromptField value={launch.prompt} maxLength={preflight.maxPromptLength} problem={launch.promptProblem} disabled={launch.phase === "sending"} onChange={launch.setPrompt} />}
      {preflight && checkout && <AttachmentPicker attachments={attachments} issueImages={preflight.issueImages} disabled={launch.phase === "sending"} />}
      {checkout && <AttachmentsPreview attachments={attachments} />}
      {launch.failure && <p role="alert" className="text-sm text-destructive">{launch.failure}</p>}
    </>
  );
}
