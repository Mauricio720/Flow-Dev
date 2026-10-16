"use client";

import { useRef } from "react";
import { ImageIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IMAGE_COPY, imageFailureCopy } from "../imageCopy";
import { ACCEPTED_IMAGE_TYPES, type ImageScope } from "../issueImageModel";
import { useImageInsertion, type ImageStatus } from "../hooks/useImageInsertion";

type Props = { id: string; value: string; invalid: boolean; describedBy?: string; scope: ImageScope; onChange: (value: string) => void };

function StatusLine({ status }: { status: ImageStatus }) {
  if (status.kind === "failed") return <p role="alert" className="text-xs text-destructive">{imageFailureCopy(status.reason)}</p>;
  const copy = status.kind === "uploading" ? IMAGE_COPY.uploading : status.kind === "inserted" ? IMAGE_COPY.inserted : IMAGE_COPY.hint;
  return <p aria-live="polite" className="max-w-[60ch] text-xs leading-relaxed text-ink-3">{copy}</p>;
}

export function ImageTextarea({ id, value, invalid, describedBy, scope, onChange }: Props) {
  const picker = useRef<HTMLInputElement>(null);
  const images = useImageInsertion({ scope, value, onChange });
  return (
    <>
      <Textarea id={id} rows={3} className="resize-y hover:border-ink-3" value={value} aria-invalid={invalid} aria-describedby={describedBy} aria-busy={images.busy} onChange={(event) => onChange(event.target.value)} onSelect={images.onSelect} onPaste={images.onPaste} onDrop={images.onDrop} onDragOver={images.onDragOver} />
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button type="button" variant="ghost" size="sm" disabled={images.busy} onClick={() => picker.current?.click()}><ImageIcon />{IMAGE_COPY.insert}</Button>
        <input ref={picker} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple hidden tabIndex={-1} onChange={images.onFileChosen} />
        <StatusLine status={images.status} />
      </div>
    </>
  );
}
