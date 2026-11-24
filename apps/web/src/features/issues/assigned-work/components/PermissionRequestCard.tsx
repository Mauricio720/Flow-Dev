"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult, PermissionDecision, PermissionEntry } from "../sessionContract";
import { permissionActionLabel } from "../sessionCopy";
import { PermissionDenyForm } from "./PermissionDenyForm";
import { PermissionSummary } from "./PermissionSummary";

type Props = { entry: PermissionEntry; agent: string; canAnswer: boolean; busy: boolean; onDecide: (requestId: string, decision: PermissionDecision, reason?: string) => Promise<ActionResult> };

const FRAME = "space-y-3 rounded-xl border-2 border-clarify/40 bg-raised p-4";

function offeredDecisions(entry: PermissionEntry) {
  return entry.offers.filter((decision) => decision !== "allow_always" || Boolean(entry.suggestedRule && entry.alwaysScope));
}

export function PermissionRequestCard({ entry, agent, canAnswer, busy, onDecide }: Props) {
  const [denying, setDenying] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const label = `Aprovação do ${agent === "codex" ? "Codex" : "Claude Code"}`;
  if (entry.status !== "pending" || !canAnswer) return <section aria-label={label} className={FRAME}><PermissionSummary entry={entry} /></section>;
  async function decide(decision: PermissionDecision, reason?: string) {
    setFailure(null);
    setFailure(await onDecide(entry.id, decision, reason?.trim() ? reason : undefined));
  }
  return (
    <section aria-label={label} className={FRAME}>
      <PermissionSummary entry={entry} />
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
      <div className="flex flex-wrap gap-2">
        {offeredDecisions(entry).map((decision) => decision === "deny" ? <Button key={decision} type="button" variant="outline" disabled={busy} aria-expanded={denying} onClick={() => setDenying((value) => !value)}>{permissionActionLabel(decision, entry.alwaysScope, entry.suggestedRule)}</Button> : <Button key={decision} type="button" variant={decision === "allow_always" ? "secondary" : "default"} disabled={busy} onClick={() => void decide(decision)}>{permissionActionLabel(decision, entry.alwaysScope, entry.suggestedRule)}</Button>)}
      </div>
      {denying && <PermissionDenyForm busy={busy} onDeny={(reason) => void decide("deny", reason)} />}
    </section>
  );
}
