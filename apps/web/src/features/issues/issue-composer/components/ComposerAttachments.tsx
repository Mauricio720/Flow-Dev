"use client";

import Image from "next/image";
import { useRef } from "react";
import { ImageIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ATTACHMENT_COPY, IMAGE_COPY, imageFailureCopy } from "../imageCopy";
import { ACCEPTED_IMAGE_TYPES, imageRoute } from "../issueImageModel";
import type { MessageAttachment, MessageAttachments } from "../hooks/useMessageAttachments";

type Props = { attachments: MessageAttachments };

const THUMB_SIZE = 64;

function AttachmentThumb({ attachment, onRemove }: { attachment: MessageAttachment; onRemove: () => void }) {
  return (
    <li className="group relative size-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface">
      <Image src={imageRoute(attachment.imageId)} alt={attachment.name} width={THUMB_SIZE} height={THUMB_SIZE} unoptimized className="size-full object-cover" />
      <button type="button" aria-label={`${ATTACHMENT_COPY.remove} ${attachment.name}`} title={ATTACHMENT_COPY.remove} onClick={onRemove} className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-raised/90 text-ink shadow-raised hover:bg-raised focus-visible:outline-2 focus-visible:outline-project">
        <XIcon size={12} />
      </button>
    </li>
  );
}

function AttachmentStatusLine({ attachments }: Props) {
  const { status } = attachments;
  if (status.kind === "failed") return <p role="alert" className="text-xs text-destructive">{imageFailureCopy(status.reason)}</p>;
  if (status.kind === "uploading") return <p role="status" className="text-xs text-ink-3">{IMAGE_COPY.uploading}</p>;
  if (!attachments.attachments.length) return null;
  return <p className="text-xs text-ink-3">{ATTACHMENT_COPY.hint}</p>;
}

export function AttachmentStrip({ attachments }: Props) {
  if (!attachments.attachments.length && attachments.status.kind === "idle") return null;
  return (
    <div className="space-y-1.5 px-4 pt-2">
      {attachments.attachments.length > 0 && (
        <ul aria-label="Imagens anexadas" className="flex flex-wrap gap-2">
          {attachments.attachments.map((attachment) => <AttachmentThumb key={attachment.imageId} attachment={attachment} onRemove={() => attachments.remove(attachment.imageId)} />)}
        </ul>
      )}
      <AttachmentStatusLine attachments={attachments} />
    </div>
  );
}

export function AttachButton({ attachments, disabled }: Props & { disabled: boolean }) {
  const picker = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button type="button" variant="ghost" size="icon" aria-label={ATTACHMENT_COPY.attach} title={ATTACHMENT_COPY.attach} disabled={disabled || attachments.busy} onClick={() => picker.current?.click()}>
        <ImageIcon size={18} />
      </Button>
      <input ref={picker} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple hidden tabIndex={-1} onChange={attachments.onFileChosen} />
    </>
  );
}
