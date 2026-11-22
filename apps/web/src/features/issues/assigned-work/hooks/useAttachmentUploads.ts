"use client";

import { useState } from "react";
import { runUpload } from "../attachmentUploadRunner";
import { ATTACHMENTS_LIMIT_MESSAGE, ATTACHMENTS_TOTAL_MESSAGE } from "../terminalCopy";
import { activeUploadBytes, activeUploadCount, limitBreach, newItem, patchItem, rejectedItem, uploadedIdsOf, type AttachmentItem, type LimitBreach, type Reserved } from "../terminalAttachmentModel";
import type { TerminalScope } from "../terminalContract";
import { discardStagedAttachment, useStagingCleanup } from "./useStagingCleanup";

const LIMIT_MESSAGES: Record<LimitBreach, string> = { count: ATTACHMENTS_LIMIT_MESSAGE, total_size: ATTACHMENTS_TOTAL_MESSAGE };

export function useAttachmentUploads(scope: TerminalScope, reserved: Reserved) {
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const staging = useStagingCleanup(uploadedIdsOf(items));
  const update = (localId: string, patch: Partial<AttachmentItem>) => setItems((current) => patchItem(current, localId, patch));
  const upload = (item: AttachmentItem) => runUpload({ scope, item, update, staging });
  function add(files: File[]) {
    const used = { count: activeUploadCount(items) + reserved.count, bytes: activeUploadBytes(items) + reserved.bytes };
    for (const file of files) {
      const breach = limitBreach(file.size, used);
      const item = breach ? rejectedItem(file, LIMIT_MESSAGES[breach]) : newItem(file);
      setItems((current) => [...current, item]);
      if (breach) continue;
      used.count += 1;
      used.bytes += file.size;
      void upload(item);
    }
  }
  function retry(localId: string) {
    const item = items.find((candidate) => candidate.localId === localId);
    if (item?.state !== "failed") return;
    update(localId, { state: "uploading", progress: 0, message: undefined });
    void upload(item);
  }
  function remove(localId: string) {
    const item = items.find((candidate) => candidate.localId === localId);
    if (item?.serverId) discardStagedAttachment(item.serverId);
    setItems((current) => current.filter((candidate) => candidate.localId !== localId));
  }
  return { items, add, retry, remove, commit: staging.commit, uploading: items.some((item) => item.state === "uploading"), uploadedIds: uploadedIdsOf(items) };
}
