"use client";

import { useEffect, useRef, useState } from "react";
import type { FolderRequest, LocalProjectActions } from "../contract";
import { FALLBACK_REASON, REASON_MESSAGE } from "../localProjectCopy";

const DEFAULT_POLL_MS = 1500;
const MAX_POLLS = 240;
const EXPIRED: FolderRequest = { state: "failed", reason: "request_expired" };

type Input = { projectId: string; actions: LocalProjectActions; onLinked: () => Promise<void>; pollMs?: number };
export type FolderPhase = "idle" | "requesting" | "pending" | "claimed";
export type FolderLink = { phase: FolderPhase; failure: string | null; choose: () => Promise<void> };

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function useFolderLink({ projectId, actions, onLinked, pollMs = DEFAULT_POLL_MS }: Input): FolderLink {
  const [phase, setPhase] = useState<FolderPhase>("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  async function outcome(): Promise<FolderRequest> {
    for (let poll = 0; poll < MAX_POLLS && mounted.current; poll += 1) {
      await wait(pollMs);
      const request = await actions.folderRequest(projectId).catch(() => null);
      if (request?.state === "linked" || request?.state === "failed") return request;
      if (request?.state === "claimed") setPhase("claimed");
    }
    return EXPIRED;
  }
  function refuse(reason: string) {
    setPhase("idle");
    setFailure(REASON_MESSAGE[reason] ?? FALLBACK_REASON);
  }
  async function choose() {
    if (phase !== "idle") return;
    setFailure(null);
    setPhase("requesting");
    const started = await actions.requestFolder(projectId);
    if (!mounted.current) return;
    if (started.status === "rejected") return refuse(started.reason);
    setPhase("pending");
    const result = await outcome();
    if (!mounted.current) return;
    setPhase("idle");
    if (result.state === "linked") return onLinked();
    setFailure(REASON_MESSAGE[result.reason ?? ""] ?? FALLBACK_REASON);
  }
  return { phase, failure, choose };
}
