"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TerminalSessionStatus } from "../executionContract";
import type { ActionResult } from "../sessionContract";
import { END_LABEL, INTERRUPT_LABEL } from "../sessionCopy";
import { SessionEndConfirm } from "./SessionEndConfirm";

type Props = { status: TerminalSessionStatus; hasPendingRequest?: boolean; busy: boolean; onInterrupt: () => Promise<ActionResult>; onEnd: () => Promise<ActionResult> };

const TURN_STATUSES: readonly TerminalSessionStatus[] = ["running", "asking"];

export function SessionControls({ status, hasPendingRequest = false, busy, onInterrupt, onEnd }: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  async function end() {
    setFailure(await onEnd());
    setConfirming(false);
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(TURN_STATUSES.includes(status) || hasPendingRequest) && <Button type="button" variant="outline" disabled={busy} onClick={async () => setFailure(await onInterrupt())}>{INTERRUPT_LABEL}</Button>}
        <Button ref={trigger} type="button" variant="outline" disabled={busy} onClick={() => setConfirming(true)}>{END_LABEL}</Button>
      </div>
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
      {confirming && <SessionEndConfirm trigger={trigger} busy={busy} onConfirm={() => void end()} onCancel={() => setConfirming(false)} />}
    </div>
  );
}
