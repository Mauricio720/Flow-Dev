"use client";

import { useEffect, useRef } from "react";
import { deleteTerminalAttachment } from "../terminalAttachmentClient";

export type StagingCleanup = { commit: () => void; isAbandoned: () => boolean };

export function discardStagedAttachment(attachmentId: string) {
  void deleteTerminalAttachment(attachmentId).catch(() => undefined);
}

export function useStagingCleanup(uploadedIds: string[]): StagingCleanup {
  const latest = useRef(uploadedIds);
  const committed = useRef(false);
  const closed = useRef(false);
  useEffect(() => {
    latest.current = uploadedIds;
  }, [uploadedIds]);
  useEffect(() => {
    closed.current = false;
    return () => {
      closed.current = true;
      if (!committed.current) latest.current.forEach(discardStagedAttachment);
    };
  }, []);
  return { commit: () => { committed.current = true; }, isAbandoned: () => closed.current && !committed.current };
}
