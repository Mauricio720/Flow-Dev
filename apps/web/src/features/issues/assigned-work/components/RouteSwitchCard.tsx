"use client";

import { Button } from "@/components/ui/button";
import { CONFIRM_SWITCH_LABEL, DECLINE_SWITCH_LABEL, ROUTE_SWITCH_CARD_LABEL, ROUTE_SWITCH_REASONS_LABEL, routeTrail, switchStateNote } from "../routeSwitchCopy";
import type { RouteSwitchDecision, RouteSwitchView } from "../sessionContract";

type Props = { proposal: RouteSwitchView; canDecide: boolean; pending: boolean; error: string | null; onDecide: (decision: RouteSwitchDecision) => void };

const FRAME = "space-y-3 rounded-xl border-2 border-clarify/40 bg-raised p-4";

function SwitchActions({ pending, onDecide }: Pick<Props, "pending" | "onDecide">) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={pending} aria-busy={pending} onClick={() => onDecide("confirm")}>{CONFIRM_SWITCH_LABEL}</Button>
      <Button type="button" variant="outline" disabled={pending} aria-busy={pending} onClick={() => onDecide("decline")}>{DECLINE_SWITCH_LABEL}</Button>
    </div>
  );
}

export function RouteSwitchCard({ proposal, canDecide, pending, error, onDecide }: Props) {
  const decidable = proposal.state === "pending" && canDecide;
  return (
    <section aria-label={ROUTE_SWITCH_CARD_LABEL} className={FRAME}>
      <p className="text-xs font-semibold text-ink-3">{routeTrail(proposal.fromRoute, proposal.toRoute)}</p>
      <p className="text-[15px] font-medium text-ink [overflow-wrap:anywhere]">{proposal.summary}</p>
      <ul aria-label={ROUTE_SWITCH_REASONS_LABEL} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
        {proposal.reasons.map((reason, index) => <li key={`${index}:${reason}`}>{reason}</li>)}
      </ul>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {decidable ? <SwitchActions pending={pending} onDecide={onDecide} /> : <p className="text-xs text-ink-3">{switchStateNote(proposal)}</p>}
    </section>
  );
}
