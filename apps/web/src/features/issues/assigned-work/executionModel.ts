import type { TaskDetail } from "./contract";
import type { ExecutionEvent, ExecutionSession, TerminalSessionStatus } from "./executionContract";
import { EVENT_LABEL, READER_WAITING_LABEL, SESSION_STATUS_LABEL, UNCONFIRMED_MESSAGE } from "./executionCopy";
import type { StageTabState } from "./stageTabs";
import type { TimelineState } from "./planningModel";

export type { ExecutionSession } from "./executionContract";

const FINAL_STATUSES: readonly TerminalSessionStatus[] = ["ended", "launch_failed"];
const TAB_STATE: Record<TerminalSessionStatus, StageTabState> = { opening: "current", running: "current", waiting: "yours", unconfirmed: "failed", ended: "done", launch_failed: "failed" };
const TIMELINE_STATE: Record<TerminalSessionStatus, TimelineState> = { opening: "current", running: "current", waiting: "current", unconfirmed: "failed", ended: "done", launch_failed: "failed" };

export function latestSession(detail: TaskDetail): ExecutionSession | null {
  return detail.execution.sessions[0] ?? null;
}

export function hasActiveSession(detail: TaskDetail): boolean {
  return detail.execution.sessions.some((session) => !FINAL_STATUSES.includes(session.status));
}

export function executionTabState(session: ExecutionSession): StageTabState {
  return TAB_STATE[session.status];
}

export function executionTimelineState(session: ExecutionSession): TimelineState {
  return TIMELINE_STATE[session.status];
}

export function sessionStatusLabel(session: ExecutionSession, options: { reader: boolean }): string {
  if (session.status === "unconfirmed") return UNCONFIRMED_MESSAGE;
  if (session.status === "waiting" && options.reader) return READER_WAITING_LABEL;
  return SESSION_STATUS_LABEL[session.status];
}

export function sessionShortLabel(session: ExecutionSession, options: { reader: boolean }): string {
  if (session.status === "waiting" && options.reader) return READER_WAITING_LABEL;
  return SESSION_STATUS_LABEL[session.status];
}

export function eventLabel(event: ExecutionEvent, options: { reader: boolean } = { reader: false }): string {
  if (event.kind === "waiting" && options.reader) return READER_WAITING_LABEL;
  return EVENT_LABEL[event.kind](event.summary);
}
