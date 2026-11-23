"use client";

import { useState } from "react";
import { formatMoment } from "@/lib/tasks/formatMoment";
import type { ExecutionSession } from "../executionContract";
import { HISTORY_LIST_LABEL } from "../executionCopy";
import { ROUTE_LABEL } from "../planningCopy";
import type { TaskScope } from "../sessionContract";
import { TERMINAL_SESSION_LABEL } from "../sessionCopy";
import { ExecutionEventList } from "./ExecutionEventList";
import { SessionConversation } from "./SessionConversation";
import { SessionAttachmentList } from "./SessionAttachmentList";

type Props = { scope: TaskScope; sessions: ExecutionSession[]; reader: boolean };

function periodOf(session: ExecutionSession) {
  const start = formatMoment(session.openedAt);
  return session.endedAt ? `${start} → ${formatMoment(session.endedAt)}` : `${start} →`;
}

function HistoryItem({ scope, session, reader }: { scope: TaskScope; session: ExecutionSession; reader: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = `history-${session.id}`;
  return (
    <li className="rounded-md border border-line">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className="w-full px-3 py-2 text-left text-sm">
        <span className="font-medium">{session.userName}</span> · {ROUTE_LABEL[session.route]} · <span className="font-mono text-xs tabular-nums">{periodOf(session)}</span>{session.runtime === "terminal" && <> · {TERMINAL_SESSION_LABEL}</>}
      </button>
      {open && <div id={panelId} className="space-y-3 border-t border-line px-3 py-3">{session.runtime === "flow_dev" ? <SessionConversation scope={{ ...scope, sessionId: session.id }} session={session} reader={reader} /> : <ExecutionEventList session={session} reader={reader} />}<SessionAttachmentList attachments={session.attachments} /></div>}
    </li>
  );
}

export function ExecutionHistory({ scope, sessions, reader }: Props) {
  if (sessions.length === 0) return null;
  return (
    <ul aria-label={HISTORY_LIST_LABEL} className="space-y-2">
      {sessions.map((session) => <HistoryItem key={session.id} scope={scope} session={session} reader={reader} />)}
    </ul>
  );
}
