import { formatMoment, formatTimeOfDay } from "@/lib/tasks/formatMoment";
import type { ExecutionSession } from "../executionContract";
import { SILENT_SINCE_PREFIX } from "../executionCopy";
import { sessionStatusLabel } from "../executionModel";

type Props = { session: ExecutionSession; reader: boolean };

const STATUS_INK: Record<ExecutionSession["status"], string> = { opening: "text-ink", running: "text-ink", waiting: "text-clarify-ink", asking: "text-clarify-ink", interrupted: "text-ink", unconfirmed: "text-destructive", ended: "text-merge-ink", launch_failed: "text-destructive" };

export function ExecutionStatus({ session, reader }: Props) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <p aria-live="polite" className={`text-[15px] font-semibold [overflow-wrap:anywhere] ${STATUS_INK[session.status]}`}>
        {sessionStatusLabel(session, { reader })}
        {session.status === "ended" && session.endedAt && <> · <time dateTime={session.endedAt} className="font-mono text-sm font-normal tabular-nums" suppressHydrationWarning>{formatMoment(session.endedAt)}</time></>}
      </p>
      {session.silentSince && <p className="text-xs text-ink-3">{SILENT_SINCE_PREFIX} <time dateTime={session.silentSince} className="font-mono tabular-nums" suppressHydrationWarning>{formatTimeOfDay(session.silentSince)}</time></p>}
    </div>
  );
}
