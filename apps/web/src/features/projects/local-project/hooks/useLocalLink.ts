"use client";

import { useRef, useState } from "react";
import { createRequestKeys } from "@/lib/tasks/requestKeys";
import type { LocalLink, LocalProjectActions, LocalProjectLoad } from "../contract";
import { FALLBACK_REASON, REASON_MESSAGE } from "../localProjectCopy";

type Input = { projectId: string; initial: LocalProjectLoad; actions: LocalProjectActions };

function messageFor(reason: string) {
  return REASON_MESSAGE[reason] ?? FALLBACK_REASON;
}

export function useLocalLink({ projectId, initial, actions }: Input) {
  const [load, setLoad] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keys = useRef(createRequestKeys());
  async function refresh() {
    setBusy(true);
    try {
      setLoad(await actions.mine(projectId));
      setNotice(null);
    } catch {
      setNotice(FALLBACK_REASON);
    } finally {
      setBusy(false);
    }
  }
  async function unlink(link: LocalLink) {
    setBusy(true);
    try {
      const requestKey = keys.current.keyFor(`${link.linkId}:${link.revision}`);
      const result = await actions.unlink({ projectId, linkId: link.linkId, expectedRevision: link.revision, requestKey });
      if (result.status === "unlinked") setLoad({ kind: "none" });
      else setNotice(messageFor(result.reason));
    } catch {
      setNotice(FALLBACK_REASON);
    } finally {
      setBusy(false);
    }
  }
  return { load, notice, busy, refresh, unlink };
}
