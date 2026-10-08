"use client";

import { Button } from "@/components/ui/button";
import type { ActiveLoad } from "../contract";
import { useActiveWork } from "../hooks/useActiveWork";
import { failureMessage } from "../taskCopy";
import { ACTIVE_EMPTY, ACTIVE_SHARED_EMPTY } from "../workCopy";
import { ActiveFilterToggle } from "./ActiveFilterToggle";
import { ActiveRow } from "./ActiveRow";

type Props = { projectId: string; initial: ActiveLoad };

export function ActiveWork({ projectId, initial }: Props) {
  const active = useActiveWork(projectId, initial);
  const empty = active.items.length === 0 && !active.failure && !active.busy;
  return (
    <section aria-labelledby="active-work-title" className="overflow-hidden rounded-xl border border-line bg-raised">
      <div className="flex min-h-13 flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-2">
        <h2 id="active-work-title" className="text-[15px] font-semibold">Em andamento</h2>
        <ActiveFilterToggle filter={active.filter} busy={active.busy} onSelect={(filter) => void active.select(filter)} />
      </div>
      {active.failure && <p role="alert" className="px-5 py-5 text-sm text-ink-2">{failureMessage(active.failure)}</p>}
      {empty && <p role="status" className="px-5 py-6 text-sm text-ink-2">{active.filter === "mine" ? ACTIVE_EMPTY : ACTIVE_SHARED_EMPTY}</p>}
      {active.items.length > 0 && <ul aria-label="Trabalho em andamento" className="divide-y divide-line">{active.items.map((item) => <ActiveRow key={item.taskId} projectId={projectId} item={item} />)}</ul>}
      {active.nextCursor && <div className="border-t border-line px-5 py-3"><Button type="button" variant="outline" size="sm" disabled={active.busy} onClick={() => void active.loadMore()}>Carregar mais</Button></div>}
    </section>
  );
}
