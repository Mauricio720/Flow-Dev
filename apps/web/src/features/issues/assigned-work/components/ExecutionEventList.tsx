import { formatMoment } from "@/lib/tasks/formatMoment";
import type { ExecutionSession } from "../executionContract";
import { EVENTS_LIST_LABEL, NO_EVENTS_NOTE, droppedEventsNote, hiddenEventsNote } from "../executionCopy";
import { eventLabel } from "../executionModel";

type Props = { session: ExecutionSession; reader: boolean };

function EventNotes({ session }: { session: ExecutionSession }) {
  return (
    <>
      {session.hiddenEvents > 0 && <p className="text-xs text-ink-3">{hiddenEventsNote(session.hiddenEvents)}</p>}
      {session.droppedEvents > 0 && <p className="text-xs text-ink-3">{droppedEventsNote(session.droppedEvents)}</p>}
    </>
  );
}

export function ExecutionEventList({ session, reader }: Props) {
  return (
    <div className="space-y-2">
      <EventNotes session={session} />
      {session.events.length === 0 ? <p className="text-sm text-ink-3">{NO_EVENTS_NOTE}</p> : (
        <ol aria-label={EVENTS_LIST_LABEL} className="space-y-1.5">
          {session.events.map((event, index) => (
            <li key={`${event.occurredAt}-${index}`} className="flex gap-3 text-sm">
              <time dateTime={event.occurredAt} className="shrink-0 font-mono text-xs tabular-nums text-ink-3" suppressHydrationWarning>{formatMoment(event.occurredAt)}</time>
              <span className="min-w-0 [overflow-wrap:anywhere]">{eventLabel(event, { reader })}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
