import type { TerminalEventKind } from "../../terminal/terminalEventKind";
import type { SessionMessageRecord, SessionRequestRecord } from "../../terminal/sessionInteractionPorts";
import type { RouteSwitchRecord } from "./routeSwitchDao";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";

export type TimelineEventRow = { id: string; kind: TerminalEventKind; summary: string; occurredAt: Date };
export type TimelineRows = { messages: SessionMessageRecord[]; requests: SessionRequestRecord[]; events: TimelineEventRow[]; routeSwitches: RouteSwitchRecord[]; sessionStatus: TerminalSessionStatus };
export type TimelineWindow = TimelineRows & { total: number };

export interface SessionTimelineDao {
  latest(sessionId: string, limit: number): Promise<TimelineWindow>;
  changedSince(sessionId: string, since: Date, limit: number): Promise<TimelineRows>;
}
