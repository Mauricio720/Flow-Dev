"use client";

import { useRouteSwitchDecision } from "../hooks/useRouteSwitchDecision";
import { useSessionActions } from "../hooks/useSessionActions";
import { useSessionTimeline } from "../hooks/useSessionTimeline";
import type { ExecutionSession } from "../executionContract";
import type { SessionScope } from "../sessionContract";
import { conversationLabelFor, NO_ENTRIES_NOTE, READ_ONLY_NOTE, hiddenEntriesNote } from "../sessionCopy";
import { isFinalStatus } from "../sessionTimelineModel";
import { ConversationScroll } from "./ConversationScroll";
import { SessionConnectionStatus } from "./SessionConnectionStatus";
import { SessionComposer } from "./SessionComposer";
import { SessionControls } from "./SessionControls";
import { SessionEntry } from "./SessionEntry";

type Props = { scope: SessionScope; session: ExecutionSession; reader: boolean };

export function SessionConversation(props: Props) {
  const { projectId, taskId, sessionId } = props.scope;
  return <SessionConversationContent key={`${projectId}:${taskId}:${sessionId}`} {...props} />;
}

function SessionConversationContent({ scope, session, reader }: Props) {
  const timeline = useSessionTimeline(scope);
  const actions = useSessionActions(scope);
  const routeSwitch = useRouteSwitchDecision(scope, timeline.retry);
  const status = timeline.status ?? session.status;
  const final = isFinalStatus(status);
  const canControl = timeline.loaded ? timeline.canControl && !final : false;
  const hasPendingRequest = timeline.entries.some((entry) => (entry.type === "question" || entry.type === "permission") && entry.status === "pending");
  return (
    <div className="space-y-4">
      <SessionConnectionStatus session={{ ...session, status }} reader={timeline.loaded ? !timeline.canControl : reader} timeline={timeline} />
      {timeline.hiddenEntries > 0 && <p className="text-xs text-ink-3">{hiddenEntriesNote(timeline.hiddenEntries)}</p>}
      <ConversationScroll entryCount={timeline.entries.length} label={conversationLabelFor(session.agent)}>
        {timeline.entries.map((entry) => <li key={entry.id}><SessionEntry entry={entry} agent={session.agent} canAnswer={canControl} actions={actions} routeSwitch={routeSwitch} /></li>)}
      </ConversationScroll>
      {timeline.loaded && !timeline.failed && timeline.entries.length === 0 && <p className="text-sm text-ink-3">{NO_ENTRIES_NOTE}</p>}
      {timeline.loaded && !final && !timeline.canControl && <p role="note" className="text-sm text-ink-2">{READ_ONLY_NOTE}</p>}
      {canControl && <SessionComposer agent={session.agent} busy={actions.busy} onSend={actions.send} controls={<SessionControls status={status} hasPendingRequest={hasPendingRequest} busy={actions.busy} onInterrupt={actions.interrupt} onEnd={actions.end} />} />}
    </div>
  );
}
