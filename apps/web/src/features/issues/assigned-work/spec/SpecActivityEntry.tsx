"use client";

import type { SpecEventEntry } from "@flow-dev/api/spec";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { EVENT_KIND_LABEL } from "./specCopy";

type Props = { entry: SpecEventEntry; target: { projectId: string; taskId: string } };
const FAILED_STATUS = "failed";

function Outcome({ entry }: { entry: SpecEventEntry }) {
  const failed = entry.status === FAILED_STATUS;
  const duration = typeof entry.durationMs === "number" ? ` · ${entry.durationMs} ms` : "";
  if (!failed && !duration) return null;
  return <p className={`text-sm ${failed ? "text-destructive" : "text-ink-3"}`}>{failed ? `Falhou${entry.reason ? `: ${entry.reason}` : ""}` : null}{duration}</p>;
}

export function SpecActivityEntry({ entry, target }: Props) {
  const [full, setFull] = useState<string | null>(null);
  async function loadFull() {
    const detail = await trpc.taskSpec.event.query({ ...target, eventId: entry.id });
    setFull(String((detail.payload as { text?: string }).text ?? ""));
  }
  return (
    <li className="space-y-1 border-b border-line py-2 last:border-b-0">
      <p className="text-xs font-medium text-ink-3">{EVENT_KIND_LABEL[entry.kind] ?? entry.kind}{entry.tool ? ` · ${entry.tool}` : ""}{entry.source ? ` · ${entry.source}` : ""}</p>
      <p className="max-w-[72ch] whitespace-pre-wrap text-[15px] text-ink-2">{full ?? entry.preview}</p>
      {entry.result && <p className="whitespace-pre-wrap text-sm text-ink-2">{entry.result}</p>}
      <Outcome entry={entry} />
      {full === null && entry.hasFullText && <Button type="button" variant="ghost" size="sm" onClick={() => void loadFull()}>Ver mensagem completa</Button>}
    </li>
  );
}
