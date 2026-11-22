"use client";

import { useRef, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import type { TerminalAttachments } from "../hooks/useTerminalAttachments";
import { formatBytes } from "../terminalAttachmentModel";
import type { IssueImageChoice } from "../terminalContract";
import { ATTACHMENTS_ACCEPT, ATTACHMENTS_DROP_HINT, ATTACHMENTS_DROP_LABEL, ATTACHMENTS_HEADING, ATTACHMENTS_INPUT_LABEL, ATTACHMENTS_PICK_LABEL, ISSUE_IMAGES_HEADING } from "../terminalCopy";
import { AttachmentItem } from "./AttachmentItem";

type Props = { attachments: TerminalAttachments; issueImages: IssueImageChoice[]; disabled: boolean };

function IssueImageList({ attachments, issueImages, disabled }: Props) {
  if (issueImages.length === 0) return null;
  return (
    <fieldset className="space-y-1.5" disabled={disabled}>
      <legend className="text-xs font-medium text-ink-3">{ISSUE_IMAGES_HEADING}</legend>
      {issueImages.map((image) => (
        <label key={image.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={attachments.isSelected(image)} onChange={() => attachments.toggleIssueImage(image.id)} />
          <span className="[overflow-wrap:anywhere]">{`${image.name} (${formatBytes(image.byteSize)})`}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function AttachmentPicker({ attachments, issueImages, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const take = (files: FileList | File[] | null | undefined) => attachments.add([...(files ?? [])]);
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    take(event.dataTransfer.files);
  };
  return (
    <section aria-label={ATTACHMENTS_HEADING} className="space-y-3">
      <h3 className="text-sm font-medium">{ATTACHMENTS_HEADING}</h3>
      <div role="group" aria-label={ATTACHMENTS_DROP_LABEL} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="flex flex-col items-start gap-2 rounded-md border border-dashed border-line px-3 py-3">
        <p className="text-sm text-ink-2">{ATTACHMENTS_DROP_HINT}</p>
        <input ref={input} type="file" multiple accept={ATTACHMENTS_ACCEPT} aria-label={ATTACHMENTS_INPUT_LABEL} tabIndex={-1} className="sr-only" disabled={disabled} onChange={(event) => { take(event.target.files); event.target.value = ""; }} />
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}>{ATTACHMENTS_PICK_LABEL}</Button>
      </div>
      <IssueImageList attachments={attachments} issueImages={issueImages} disabled={disabled} />
      {attachments.items.length > 0 && <ul className="space-y-2">{attachments.items.map((item) => <AttachmentItem key={item.localId} item={item} onRetry={attachments.retry} onRemove={attachments.remove} />)}</ul>}
      {attachments.notices.map((notice) => <p key={notice} role="status" className="text-sm text-ink-2">{notice}</p>)}
    </section>
  );
}
