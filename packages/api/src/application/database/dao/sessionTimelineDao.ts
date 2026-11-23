import type { TerminalEventKind } from "../../terminal/terminalEventKind";
import type { SessionMessageRecord, SessionRequestRecord } from "../../terminal/sessionInteractionPorts";

export type TimelineEventRow = { id: string; kind: TerminalEventKind; summary: string; occurredAt: Date };
export type TimelineRows = { messages: SessionMessageRecord[]; requests: SessionRequestRecord[]; events: TimelineEventRow[] };
export type TimelineWindow = TimelineRows & { total: number };

export interface SessionTimelineDao {
  latest(sessionId: string, limit: number): Promise<TimelineWindow>;
  changedSince(sessionId: string, since: Date, limit: number): Promise<TimelineRows>;
}
