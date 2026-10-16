"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ConcludeCopy } from "./stageCopy";

type Props = { busy: boolean; onConclude: () => void; copy: ConcludeCopy };

export function ConcludeReview({ busy, onConclude, copy }: Props) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <div><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(true)}>{copy.open}</Button></div>;
  return (
    <div role="group" aria-label={copy.group} className="space-y-3 border-t border-line pt-4">
      <p className="max-w-[62ch] text-sm leading-6 text-ink-2">{copy.warning}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={onConclude}>{copy.confirm}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(false)}>{copy.back}</Button>
      </div>
    </div>
  );
}
