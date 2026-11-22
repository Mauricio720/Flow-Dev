import { Button } from "@/components/ui/button";
import { formatBytes, type AttachmentItem as Item } from "../terminalAttachmentModel";
import { ATTACHMENT_REMOVE_LABEL, ATTACHMENT_RETRY_LABEL, uploadProgressLabel } from "../terminalCopy";

type Props = { item: Item; onRetry: (localId: string) => void; onRemove: (localId: string) => void };

function Status({ item }: { item: Item }) {
  if (item.state === "uploading") return <span aria-live="polite" className="text-xs text-ink-3">{uploadProgressLabel(item.progress)}</span>;
  if (item.state === "uploaded") return <span aria-live="polite" className="text-xs text-ink-3">{formatBytes(item.byteSize)}</span>;
  return <span role="alert" className="text-xs text-destructive">{item.message}</span>;
}

export function AttachmentItem({ item, onRetry, onRemove }: Props) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-line px-3 py-2 text-sm">
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium [overflow-wrap:anywhere]">{item.name}</p>
        <Status item={item} />
      </div>
      <div className="flex gap-2">
        {item.state === "failed" && <Button type="button" variant="outline" size="sm" onClick={() => onRetry(item.localId)}>{ATTACHMENT_RETRY_LABEL}</Button>}
        {item.state !== "uploading" && <Button type="button" variant="ghost" size="sm" aria-label={`${ATTACHMENT_REMOVE_LABEL} ${item.name}`} onClick={() => onRemove(item.localId)}>{ATTACHMENT_REMOVE_LABEL}</Button>}
      </div>
    </li>
  );
}
