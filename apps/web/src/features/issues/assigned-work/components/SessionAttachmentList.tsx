import type { ExecutionAttachment } from "../executionContract";
import { ATTACHMENTS_LIST_LABEL, REMOVED_ATTACHMENT_LABEL, availableUntilLabel } from "../executionCopy";
import { formatBytes } from "../terminalAttachmentModel";

const DAY_MONTH = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

function availability(attachment: ExecutionAttachment) {
  if (attachment.removed || !attachment.availableUntil) return REMOVED_ATTACHMENT_LABEL;
  return availableUntilLabel(DAY_MONTH.format(new Date(attachment.availableUntil)));
}

export function SessionAttachmentList({ attachments }: { attachments: ExecutionAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <ul aria-label={ATTACHMENTS_LIST_LABEL} className="space-y-1 text-sm">
      {attachments.map((attachment, index) => (
        <li key={`${attachment.name}-${index}`} className="[overflow-wrap:anywhere]">{attachment.name} · {attachment.contentType} · {formatBytes(attachment.byteSize)} · {availability(attachment)}</li>
      ))}
    </ul>
  );
}
