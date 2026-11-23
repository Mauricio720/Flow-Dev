"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "../sessionContract";
import { COMPOSER_HINT, COMPOSER_LABEL, MAX_MESSAGE_LENGTH, MESSAGE_LIMIT_MESSAGE, SENDING_LABEL, SEND_LABEL, lengthCounter } from "../sessionCopy";

type Props = { busy: boolean; onSend: (content: string, requestKey: string) => Promise<ActionResult> };

export function SessionComposer({ busy, onSend }: Props) {
  const [content, setContent] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const requestKey = useRef(crypto.randomUUID());
  const tooLong = content.length > MAX_MESSAGE_LENGTH;
  const blocked = busy || content.trim().length === 0 || tooLong;
  async function submit() {
    if (blocked) return;
    const result = await onSend(content, requestKey.current);
    setFailure(result);
    if (result !== null) return;
    setContent("");
    requestKey.current = crypto.randomUUID();
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    void submit();
  }
  return (
    <div className="space-y-2 rounded-xl border border-line bg-raised p-3 shadow-raised">
      <label htmlFor="session-message" className="text-sm font-medium text-ink">{COMPOSER_LABEL}</label>
      <Textarea id="session-message" value={content} disabled={busy} aria-invalid={tooLong ? true : undefined} aria-describedby="session-message-hint" onChange={(event) => setContent(event.target.value)} onKeyDown={onKeyDown} className="max-h-48 min-h-20" />
      <div id="session-message-hint" className="flex flex-wrap justify-between gap-2 text-xs text-ink-3">
        <span className={tooLong ? "text-destructive" : undefined}>{tooLong ? MESSAGE_LIMIT_MESSAGE : COMPOSER_HINT}</span>
        <span>{lengthCounter(content.length, MAX_MESSAGE_LENGTH)}</span>
      </div>
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
      <div className="flex justify-end"><Button type="button" disabled={blocked} onClick={() => void submit()}>{busy ? SENDING_LABEL : SEND_LABEL}</Button></div>
    </div>
  );
}
