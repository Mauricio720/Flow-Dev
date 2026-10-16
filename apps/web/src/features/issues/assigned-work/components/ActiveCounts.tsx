import { cn } from "@/lib/utils";
import type { ActiveItem } from "../contract";
import { STATE_TONE } from "../progressTone";
import type { StageState } from "../spec/unified/flowStages";
import { progressSummary } from "../workProgress";

const COUNTED: { state: StageState; label: (count: number) => string }[] = [
  { state: "current", label: (count) => `${count} em execução` },
  { state: "yours", label: (count) => `${count} aguardando ação` },
  { state: "failed", label: (count) => `${count} com falha` },
];

export function ActiveCounts({ items, operator }: { items: ActiveItem[]; operator: boolean }) {
  const states = items.map((item) => progressSummary(item, operator).state);
  const counts = COUNTED.map((entry) => ({ ...entry, count: states.filter((state) => state === entry.state).length })).filter((entry) => entry.count > 0);
  if (counts.length === 0) return null;
  return (
    <ul aria-label="Resumo do trabalho em andamento" className="flex flex-wrap gap-1.5">
      {counts.map((entry) => <li key={entry.state} className={cn("rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", STATE_TONE[entry.state].count)}>{entry.label(entry.count)}</li>)}
    </ul>
  );
}
