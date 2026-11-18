"use client";

import { useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from "react";
import { ImageUploadFailure, uploadIssueImage } from "./imageUploadApi";
import { acceptFileDrag, chosenFiles, takeFiles } from "./imageEvents";

export type MessageAttachment = { imageId: string; name: string };
export type AttachmentStatus = { kind: "idle" | "uploading" } | { kind: "failed"; reason: string };

export const MAX_MESSAGE_ATTACHMENTS = 10;
export const MESSAGE_ATTACHMENT_LIMIT_REASON = "message_image_limit";
const UNKNOWN_REASON = "upload_failed";
const IDLE: AttachmentStatus = { kind: "idle" };

function appended(current: MessageAttachment[], attachment: MessageAttachment) {
  return current.some((item) => item.imageId === attachment.imageId) ? current : [...current, attachment];
}

function failureOf(error: unknown): AttachmentStatus {
  return { kind: "failed", reason: error instanceof ImageUploadFailure ? error.reason : UNKNOWN_REASON };
}

export function useMessageAttachments(projectId: string) {
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [status, setStatus] = useState<AttachmentStatus>(IDLE);
  async function add(files: File[]) {
    if (!files.length) return;
    if (attachments.length + files.length > MAX_MESSAGE_ATTACHMENTS) return setStatus({ kind: "failed", reason: MESSAGE_ATTACHMENT_LIMIT_REASON });
    setStatus({ kind: "uploading" });
    try {
      for (const file of files) {
        const imageId = await uploadIssueImage({ projectId }, file);
        setAttachments((current) => appended(current, { imageId, name: file.name }));
      }
      setStatus(IDLE);
    } catch (error) {
      setStatus(failureOf(error));
    }
  }
  return {
    attachments,
    status,
    busy: status.kind === "uploading",
    imageIds: attachments.map((attachment) => attachment.imageId),
    remove: (imageId: string) => setAttachments((current) => current.filter((attachment) => attachment.imageId !== imageId)),
    clear: () => { setAttachments([]); setStatus(IDLE); },
    onPaste: (event: ClipboardEvent<HTMLElement>) => void add(takeFiles(event, event.clipboardData.files)),
    onDrop: (event: DragEvent<HTMLElement>) => void add(takeFiles(event, event.dataTransfer.files)),
    onDragOver: acceptFileDrag,
    onFileChosen: (event: ChangeEvent<HTMLInputElement>) => void add(chosenFiles(event.currentTarget)),
  };
}

export type MessageAttachments = ReturnType<typeof useMessageAttachments>;
