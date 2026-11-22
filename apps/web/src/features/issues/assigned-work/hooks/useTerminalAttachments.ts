"use client";

import type { IssueImageChoice, TerminalScope } from "../terminalContract";
import { useAttachmentUploads } from "./useAttachmentUploads";
import { useIssueImageSelection } from "./useIssueImageSelection";

type Input = TerminalScope & { issueImages: IssueImageChoice[] };

export function useTerminalAttachments({ projectId, taskId, issueImages }: Input) {
  const images = useIssueImageSelection(issueImages);
  const reserved = { count: images.selected.length, bytes: images.selected.reduce((total, image) => total + image.byteSize, 0) };
  const uploads = useAttachmentUploads({ projectId, taskId }, reserved);
  return {
    items: uploads.items, add: uploads.add, retry: uploads.retry, remove: uploads.remove, commit: uploads.commit, uploading: uploads.uploading,
    isSelected: images.isSelected, toggleIssueImage: images.toggle, selectedImages: images.selected, notices: images.notices,
    attachmentIds: uploads.uploadedIds, issueImageIds: images.selected.map((image) => image.id),
  };
}

export type TerminalAttachments = ReturnType<typeof useTerminalAttachments>;
