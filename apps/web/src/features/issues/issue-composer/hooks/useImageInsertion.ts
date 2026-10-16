"use client";

import { useLayoutEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type SyntheticEvent } from "react";
import { imageFiles, imageMarkdown, insertImage, type ImageScope, type TextSelection } from "../issueImageModel";
import { ImageUploadFailure, uploadIssueImage } from "./imageUploadApi";

export type ImageStatus = { kind: "idle" | "uploading" | "inserted" } | { kind: "failed"; reason: string };
type Input = { scope: ImageScope; value: string; onChange: (value: string) => void };

const UNKNOWN_REASON = "upload_failed";
const FILE_DRAG_TYPE = "Files";

export function useImageInsertion({ scope, value, onChange }: Input) {
  const latest = useRef({ value, onChange });
  const selection = useRef<TextSelection | null>(null);
  const [status, setStatus] = useState<ImageStatus>({ kind: "idle" });
  useLayoutEffect(() => { latest.current = { value, onChange }; });
  function insertMarkdown(markdown: string) {
    const next = insertImage(latest.current.value, selection.current, markdown);
    latest.current.value = next.text;
    selection.current = { start: next.cursor, end: next.cursor };
    latest.current.onChange(next.text);
  }
  async function insertFiles(files: File[]) {
    if (!files.length) return;
    setStatus({ kind: "uploading" });
    setStatus(await uploadInto(scope, files, insertMarkdown));
  }
  return {
    status,
    busy: status.kind === "uploading",
    onSelect: (event: SyntheticEvent<HTMLTextAreaElement>) => { selection.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; },
    onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void insertFiles(takeFiles(event, event.clipboardData.files)),
    onDrop: (event: DragEvent<HTMLTextAreaElement>) => void insertFiles(takeFiles(event, event.dataTransfer.files)),
    onDragOver: (event: DragEvent<HTMLTextAreaElement>) => { if (event.dataTransfer.types.includes(FILE_DRAG_TYPE)) event.preventDefault(); },
    onFileChosen: (event: ChangeEvent<HTMLInputElement>) => void insertFiles(chosenFiles(event.currentTarget)),
  };
}

async function uploadInto(scope: ImageScope, files: File[], insert: (markdown: string) => void): Promise<ImageStatus> {
  try {
    for (const file of files) insert(imageMarkdown(file.name, await uploadIssueImage(scope, file)));
    return { kind: "inserted" };
  } catch (error) {
    return { kind: "failed", reason: error instanceof ImageUploadFailure ? error.reason : UNKNOWN_REASON };
  }
}

function takeFiles(event: { preventDefault: () => void }, source: FileList) {
  const files = imageFiles(source);
  if (files.length) event.preventDefault();
  return files;
}

function chosenFiles(input: HTMLInputElement) {
  const files = imageFiles(input.files);
  input.value = "";
  return files;
}
