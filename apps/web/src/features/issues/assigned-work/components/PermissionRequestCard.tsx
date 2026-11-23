"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult, PermissionDecision, PermissionEntry } from "../sessionContract";
import { ALLOW_LABEL, DENY_LABEL, allowAlwaysLabel } from "../sessionCopy";
import { PermissionDenyForm } from "./PermissionDenyForm";
import { PermissionSummary } from "./PermissionSummary";

type Props = { entry: PermissionEntry; canAnswer: boolean; busy: boolean; onDecide: (requestId: string, decision: PermissionDecision, reason?: string) => Promise<ActionResult> };

const FRAME = "space-y-3 rounded-xl border-2 border-clarify/40 bg-raised p-4";

export function PermissionRequestCard({ entry, canAnswer, busy, onDecide }: Props) {
  const [denying, setDenying] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  if (entry.status !== "pending" || !canAnswer) return <section aria-label="Aprovação do Claude" className={FRAME}><PermissionSummary entry={entry} /></section>;
  async function decide(decision: PermissionDecision, reason?: string) {
    setFailure(null);
    setFailure(await onDecide(entry.id, decision, reason?.trim() ? reason : undefined));
  }
  return (
    <section aria-label="Aprovação do Claude" className={FRAME}>
      <PermissionSummary entry={entry} />
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => void decide("allow")}>{ALLOW_LABEL}</Button>
        {entry.suggestedRule && <Button type="button" variant="secondary" disabled={busy} onClick={() => void decide("allow_always")}>{allowAlwaysLabel(entry.suggestedRule)}</Button>}
        <Button type="button" variant="outline" disabled={busy} aria-expanded={denying} onClick={() => setDenying((value) => !value)}>{DENY_LABEL}</Button>
      </div>
      {denying && <PermissionDenyForm busy={busy} onDeny={(reason) => void decide("deny", reason)} />}
    </section>
  );
}
