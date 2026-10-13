"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CONCLUDE_COPY } from "./stageCopy";

type Props = { busy: boolean; onConclude: () => void };

export function ConcludeReview({ busy, onConclude }: Props) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <div><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(true)}>{CONCLUDE_COPY.open}</Button></div>;
  return (
    <div role="group" aria-label={CONCLUDE_COPY.group} className="space-y-3 border-t border-line pt-4">
      <p className="max-w-[62ch] text-sm leading-6 text-ink-2">{CONCLUDE_COPY.warning}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={onConclude}>{CONCLUDE_COPY.confirm}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(false)}>{CONCLUDE_COPY.back}</Button>
      </div>
    </div>
  );
}
