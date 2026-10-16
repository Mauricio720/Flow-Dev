"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { REPLAN_COPY } from "../planningCopy";

export type ReplanOffer = { busy: boolean; onReplan: () => void };

export function ReplanControl({ busy, onReplan }: ReplanOffer) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <div><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirming(true)}>{REPLAN_COPY.open}</Button></div>;
  return (
    <div role="group" aria-label={REPLAN_COPY.group} className="space-y-3 border-t border-line pt-4">
      <p className="max-w-[62ch] text-sm leading-6 text-ink-2">{REPLAN_COPY.warning}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => { onReplan(); setConfirming(false); }}>{REPLAN_COPY.confirm}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(false)}>{REPLAN_COPY.back}</Button>
      </div>
    </div>
  );
}
