"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DENY_REASON_LABEL, DENY_SEND_LABEL, MAX_FREE_TEXT_LENGTH, REASON_LIMIT_MESSAGE, lengthCounter } from "../sessionCopy";

type Props = { busy: boolean; onDeny: (reason: string) => void };

export function PermissionDenyForm({ busy, onDeny }: Props) {
  const [reason, setReason] = useState("");
  const tooLong = reason.length > MAX_FREE_TEXT_LENGTH;
  return (
    <div className="space-y-2">
      <label htmlFor="deny-reason" className="text-sm text-ink-2">{DENY_REASON_LABEL}</label>
      <Textarea id="deny-reason" value={reason} disabled={busy} aria-invalid={tooLong ? true : undefined} onChange={(event) => setReason(event.target.value)} className="min-h-20" />
      <p className={`text-xs ${tooLong ? "text-destructive" : "text-ink-3"}`}>{tooLong ? REASON_LIMIT_MESSAGE : lengthCounter(reason.length, MAX_FREE_TEXT_LENGTH)}</p>
      <Button type="button" variant="outline" disabled={busy || tooLong} onClick={() => onDeny(reason)}>{DENY_SEND_LABEL}</Button>
    </div>
  );
}
