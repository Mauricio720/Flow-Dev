"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { COPY_COMMAND_LABEL, COPY_DONE_NOTE, COPY_FAILED_NOTE, LOGIN_COMMAND_HINT } from "../agentAccountActionCopy";

export function LoginCommandField({ command }: { command: string }) {
  const [note, setNote] = useState<string | null>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setNote(COPY_DONE_NOTE);
    } catch {
      setNote(COPY_FAILED_NOTE);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-2">{LOGIN_COMMAND_HINT}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs leading-5 [overflow-wrap:anywhere]">{command}</code>
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>{COPY_COMMAND_LABEL}</Button>
      </div>
      {note && <p role="status" className="text-sm text-ink-2">{note}</p>}
    </div>
  );
}
