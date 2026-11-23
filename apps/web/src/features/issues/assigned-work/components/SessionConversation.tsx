"use client";

import { useSessionActions } from "../hooks/useSessionActions";
import { useSessionTimeline } from "../hooks/useSessionTimeline";
import type { ExecutionSession } from "../executionContract";
import type { SessionScope } from "../sessionContract";
import { CONVERSATION_LABEL, LOAD_FAILED_NOTE, NO_ENTRIES_NOTE, READ_ONLY_NOTE, hiddenEntriesNote } from "../sessionCopy";
import { isFinalStatus } from "../sessionTimelineModel";
import { ExecutionStatus } from "./ExecutionStatus";
import { SessionComposer } from "./SessionComposer";
import { SessionControls } from "./SessionControls";
import { SessionEntry } from "./SessionEntry";

type Props = { scope: SessionScope; session: ExecutionSession; reader: boolean };

export function SessionConversation({ scope, session, reader }: Props) {
  const timeline = useSessionTimeline(scope);
  const actions = useSessionActions(scope);
  const status = timeline.status ?? session.status;
  const final = isFinalStatus(status);
  const canControl = timeline.loaded ? timeline.canControl && !final : false;
  return (
    <div className="space-y-4">
      <ExecutionStatus session={{ ...session, status }} reader={timeline.loaded ? !timeline.canControl : reader} />
      {timeline.hiddenEntries > 0 && <p className="text-xs text-ink-3">{hiddenEntriesNote(timeline.hiddenEntries)}</p>}
      <ol aria-label={CONVERSATION_LABEL} aria-live="polite" className="space-y-3">
        {timeline.entries.map((entry) => <li key={entry.id}><SessionEntry entry={entry} canAnswer={canControl} actions={actions} /></li>)}
      </ol>
      {timeline.loaded && timeline.entries.length === 0 && <p className="text-sm text-ink-3">{NO_ENTRIES_NOTE}</p>}
      {timeline.failed && <p role="status" className="text-xs text-ink-3">{LOAD_FAILED_NOTE}</p>}
      {timeline.loaded && !final && !timeline.canControl && <p role="note" className="text-sm text-ink-2">{READ_ONLY_NOTE}</p>}
      {canControl && <SessionControls status={status} busy={actions.busy} onInterrupt={actions.interrupt} onEnd={actions.end} />}
      {canControl && <SessionComposer busy={actions.busy} onSend={actions.send} />}
    </div>
  );
}
