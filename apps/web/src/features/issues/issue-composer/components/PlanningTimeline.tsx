import { CheckIcon, XIcon } from "@/components/icons";
import type { TaskDetail } from "../contract";
import { timelineEntries, type TimelineEntry, type TimelineState } from "../planningModel";
import { formatMoment } from "../toolModel";

const STATE_LABEL: Record<TimelineState, string> = { done: "Concluído", current: "Em andamento", failed: "Falhou", pending: "Pendente" };
const STATE_INK: Record<TimelineState, string> = { done: "text-merge-ink", current: "text-ink", failed: "text-destructive", pending: "text-ink-3" };
const TRACK_INK: Record<TimelineState, string> = { done: "border-merge", current: "border-merge", failed: "border-dashed border-ink-3", pending: "border-dashed border-ink-3" };
const STOP_FRAME = "relative z-10 grid size-5 shrink-0 place-items-center rounded-full";
const TRACK_FRAME = "absolute top-5 bottom-0 left-[9px] border-l-2 sm:top-[9px] sm:right-0 sm:bottom-auto sm:left-5 sm:border-t-2 sm:border-l-0";

function Stop({ state }: { state: TimelineState }) {
  if (state === "done") return <span aria-hidden="true" className={`${STOP_FRAME} bg-merge text-ground`}><CheckIcon size={12} strokeWidth={3} /></span>;
  if (state === "failed") return <span aria-hidden="true" className={`${STOP_FRAME} border-2 border-destructive bg-raised text-destructive`}><XIcon size={10} strokeWidth={3} /></span>;
  if (state === "current") return <span aria-hidden="true" className={`${STOP_FRAME} border-2 border-ink bg-raised`}><span className="node-running size-2 rounded-full bg-ink" /></span>;
  return <span aria-hidden="true" className={`${STOP_FRAME} border-2 border-dashed border-ink-3 bg-raised`} />;
}

function StopCaption({ entry }: { entry: TimelineEntry }) {
  return (
    <div className="min-w-0 space-y-0.5 sm:mt-2.5">
      <p className="text-sm leading-snug font-semibold [overflow-wrap:anywhere]">{entry.label}</p>
      <p className="text-xs text-ink-3">{entry.actor}</p>
      <p className={`text-xs ${STATE_INK[entry.state]}`}>{STATE_LABEL[entry.state]}{entry.at && <> · <time dateTime={entry.at} className="font-mono tabular-nums" suppressHydrationWarning>{formatMoment(entry.at)}</time></>}{entry.action && <span className="text-ink-2"> · Próximo passo: {entry.action}</span>}</p>
    </div>
  );
}

export function PlanningTimeline({ detail }: { detail: TaskDetail }) {
  const entries = timelineEntries(detail);
  return (
    <ol aria-label="Linha do tempo do planejamento" className="sm:grid sm:auto-cols-fr sm:grid-flow-col">
      {entries.map((entry, index) => {
        const following = entries[index + 1];
        return (
          <li key={entry.key} className="relative flex gap-3 pb-5 last:pb-0 sm:block sm:pr-4 sm:pb-0 sm:last:pr-0">
            {following && <span aria-hidden="true" className={`${TRACK_FRAME} ${TRACK_INK[following.state]}`} />}
            <Stop state={entry.state} />
            <StopCaption entry={entry} />
          </li>
        );
      })}
    </ol>
  );
}
