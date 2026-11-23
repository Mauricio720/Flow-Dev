import { and, count, desc, eq, gt, or } from "drizzle-orm";
import type { TimelineEventRow } from "../../../../application/database/dao/sessionTimelineDao";
import type { TerminalEventKind } from "../../../../application/terminal/terminalEventKind";
import type { MessageRole, RequestKind, RequestPayload, RequestStatus } from "../../../../application/terminal/sessionInteraction";
import type { SessionMessageRecord, SessionRequestRecord } from "../../../../application/terminal/sessionInteractionPorts";
import type { Database } from "../../client";
import { taskTerminalEvents, taskTerminalMessages, taskTerminalRequests } from "../../schema";

export type ChangeWindow = { sessionId: string; since: Date; limit: number };

const messages = taskTerminalMessages;
const requests = taskTerminalRequests;
const events = taskTerminalEvents;

const toMessage = (row: typeof messages.$inferSelect): SessionMessageRecord => ({ ...row, role: row.role as MessageRole });
const toRequest = (row: typeof requests.$inferSelect): SessionRequestRecord => ({ ...row, kind: row.kind as RequestKind, status: row.status as RequestStatus, payload: row.payload as RequestPayload });
const toEvent = (row: typeof events.$inferSelect): TimelineEventRow => ({ id: row.id, kind: row.kind as TerminalEventKind, summary: row.summary, occurredAt: row.occurredAt });

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
  const [messageCount, requestCount, eventCount] = await Promise.all([messages, requests, events].map((table) => database.select({ total: count() }).from(table).where(eq(table.sessionId, sessionId))));
  return messageCount![0]!.total + requestCount![0]!.total + eventCount![0]!.total;
}

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
