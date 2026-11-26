import { and, count, desc, eq, gt, or } from "drizzle-orm";
import type { RouteSwitchRecord } from "../../../../application/database/dao/routeSwitchDao";
import type { TimelineEventRow } from "../../../../application/database/dao/sessionTimelineDao";
import type { TerminalEventKind } from "../../../../application/terminal/terminalEventKind";
import type { TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { MessageRole, RequestKind, RequestPayload, RequestStatus } from "../../../../application/terminal/sessionInteraction";
import type { SessionMessageRecord, SessionRequestRecord } from "../../../../application/terminal/sessionInteractionPorts";
import type { Database } from "../../client";
import { taskRouteSwitches, taskTerminalEvents, taskTerminalMessages, taskTerminalRequests, taskTerminalSessions, users } from "../../schema";

export type ChangeWindow = { sessionId: string; since: Date; limit: number };

const messages = taskTerminalMessages;
const requests = taskTerminalRequests;
const events = taskTerminalEvents;

const toMessage = (row: typeof messages.$inferSelect): SessionMessageRecord => ({ ...row, role: row.role as MessageRole });
const toRequest = (row: typeof requests.$inferSelect): SessionRequestRecord => ({ ...row, kind: row.kind as RequestKind, status: row.status as RequestStatus, payload: row.payload as RequestPayload });
const toEvent = (row: typeof events.$inferSelect): TimelineEventRow => ({ id: row.id, kind: row.kind as TerminalEventKind, summary: row.summary, occurredAt: row.occurredAt });

async function statusOf(database: Database, sessionId: string) {
  const [row] = await database.select({ status: taskTerminalSessions.status }).from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId)).limit(1);
  return row!.status as TerminalSessionStatus;
}

async function routeSwitchRows(database: Database, sessionId: string, since?: Date, limit = 200): Promise<RouteSwitchRecord[]> {
  const filter = since ? and(eq(taskRouteSwitches.sessionId, sessionId), or(gt(taskRouteSwitches.proposedAt, since), gt(taskRouteSwitches.decidedAt, since))) : eq(taskRouteSwitches.sessionId, sessionId);
  const rows = await database.select({ record: taskRouteSwitches, name: users.name, displayName: users.displayName }).from(taskRouteSwitches).leftJoin(users, eq(users.id, taskRouteSwitches.decidedByUserId)).where(filter).orderBy(taskRouteSwitches.proposedAt, taskRouteSwitches.id).limit(limit);
  return rows.map(({ record, name, displayName }) => ({ ...record, fromRoute: record.fromRoute as RouteSwitchRecord["fromRoute"], toRoute: "direct_execution", reasons: record.reasons as string[], status: record.status as RouteSwitchRecord["status"], decidedByName: displayName ?? name }));
}

export async function latestMessages(database: Database, sessionId: string, limit: number) {
  const rows = await database.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(desc(messages.occurredAt), desc(messages.id)).limit(limit);
  return rows.map(toMessage);
}

export async function latestRequests(database: Database, sessionId: string, limit: number) {
  const rows = await database.select().from(requests).where(eq(requests.sessionId, sessionId)).orderBy(desc(requests.createdAt), desc(requests.id)).limit(limit);
  return rows.map(toRequest);
}

export async function latestEvents(database: Database, sessionId: string, limit: number) {
  const rows = await database.select().from(events).where(eq(events.sessionId, sessionId)).orderBy(desc(events.occurredAt), desc(events.id)).limit(limit);
  return rows.map(toEvent);
}

export async function countEntries(database: Database, sessionId: string) {
  const [messageCount, requestCount, eventCount, switchCount] = await Promise.all([messages, requests, events, taskRouteSwitches].map((table) => database.select({ total: count() }).from(table).where(eq(table.sessionId, sessionId))));
  return messageCount![0]!.total + requestCount![0]!.total + eventCount![0]!.total + switchCount![0]!.total;
}

export async function latestRouteSwitches(database: Database, sessionId: string) { return routeSwitchRows(database, sessionId); }
export async function changedRouteSwitches(database: Database, window: ChangeWindow) { return routeSwitchRows(database, window.sessionId, window.since, window.limit); }
export { statusOf as timelineSessionStatus };

export async function changedMessages(database: Database, window: ChangeWindow) {
  const { sessionId, since, limit } = window;
  const changed = or(gt(messages.occurredAt, since), gt(messages.deliveredAt, since), eq(messages.undelivered, true));
  const rows = await database.select().from(messages).where(and(eq(messages.sessionId, sessionId), changed)).orderBy(messages.occurredAt, messages.id).limit(limit);
  return rows.map(toMessage);
}

export async function changedRequests(database: Database, window: ChangeWindow) {
  const { sessionId, since, limit } = window;
  const changed = or(gt(requests.createdAt, since), gt(requests.answeredAt, since));
  const rows = await database.select().from(requests).where(and(eq(requests.sessionId, sessionId), changed)).orderBy(requests.createdAt, requests.id).limit(limit);
  return rows.map(toRequest);
}

export async function changedEvents(database: Database, window: ChangeWindow) {
  const { sessionId, since, limit } = window;
  const rows = await database.select().from(events).where(and(eq(events.sessionId, sessionId), gt(events.occurredAt, since))).orderBy(events.occurredAt, events.id).limit(limit);
  return rows.map(toEvent);
}
