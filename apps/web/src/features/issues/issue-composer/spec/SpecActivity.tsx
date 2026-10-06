"use client";

import type { SpecEventEntry } from "@flow-dev/api/spec";
import { Button } from "@/components/ui/button";
import { QUEUED_COPY } from "./specCopy";
import { SpecActivityEntry } from "./SpecActivityEntry";

type Props = { entries: SpecEventEntry[]; queued: boolean; target: { projectId: string; taskId: string }; hasOlder: boolean; onLoadOlder: () => void };

export function SpecActivity({ entries, queued, target, hasOlder, onLoadOlder }: Props) {
  if (entries.length === 0) return queued ? <p role="status" className="text-sm text-ink-2">{QUEUED_COPY}</p> : null;
  return (
    <section aria-label="Atividade" className="space-y-1">
      <h3 className="text-[15px] font-semibold">Atividade</h3>
      {hasOlder && <Button type="button" variant="outline" size="sm" onClick={onLoadOlder}>Ver eventos anteriores</Button>}
      <ol className="max-h-96 overflow-y-auto" tabIndex={0} aria-label="Eventos da execução">{entries.map((entry) => <SpecActivityEntry key={entry.id} entry={entry} target={target} />)}</ol>
    </section>
  );
}
