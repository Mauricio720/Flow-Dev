import type { TimelineEventRow, TimelineRows } from "../../database/dao/sessionTimelineDao";
import type { PermissionPayload, QuestionPayload } from "../../terminal/sessionInteraction";
import type { SessionMessageRecord, SessionRequestRecord } from "../../terminal/sessionInteractionPorts";

export type TimelineEntry =
  | { type: "message"; id: string; role: SessionMessageRecord["role"]; content: string; truncated: boolean; queued: boolean; undelivered: boolean; at: string }
  | { type: "event"; id: string; kind: TimelineEventRow["kind"]; summary: string; at: string }
  | { type: "question"; id: string; status: SessionRequestRecord["status"]; questions: QuestionPayload["questions"]; answers?: Record<string, string | string[]>; at: string }
  | { type: "permission"; id: string; status: SessionRequestRecord["status"]; tool: string; display: { title: string; body: string }; suggestedRule: string | null; decision?: string; reason?: string; at: string };

type Ordered = { entry: TimelineEntry; changedAt: Date };

function messageEntry(message: SessionMessageRecord): Ordered {
  const queued = message.role === "user" && message.deliveredAt === null && !message.undelivered;
  const changedAt = message.deliveredAt && message.deliveredAt > message.occurredAt ? message.deliveredAt : message.occurredAt;
  return { changedAt, entry: { type: "message", id: message.id, role: message.role, content: message.content, truncated: message.truncated, queued, undelivered: message.undelivered, at: message.occurredAt.toISOString() } };
}

function requestEntry(request: SessionRequestRecord): Ordered {
  const changedAt = request.answeredAt ?? request.createdAt;
  const at = request.createdAt.toISOString();
  const answer = (request.answer ?? {}) as { answers?: Record<string, string | string[]>; decision?: string; reason?: string };
  if (request.kind === "question") {
    const base = { type: "question" as const, id: request.id, status: request.status, questions: (request.payload as QuestionPayload).questions, at };
    return { changedAt, entry: request.status === "answered" && answer.answers ? { ...base, answers: answer.answers } : base };
  }
  const payload = request.payload as PermissionPayload;
  const base = { type: "permission" as const, id: request.id, status: request.status, tool: payload.toolName, display: { title: payload.title, body: payload.body }, suggestedRule: payload.suggestedRule, at };
  return { changedAt, entry: request.status === "answered" && answer.decision ? { ...base, decision: answer.decision, ...(answer.reason ? { reason: answer.reason } : {}) } : base };
}

function eventEntry(event: TimelineEventRow): Ordered {
  return { changedAt: event.occurredAt, entry: { type: "event", id: event.id, kind: event.kind, summary: event.summary, at: event.occurredAt.toISOString() } };
}

export function mergeTimeline(rows: TimelineRows): Ordered[] {
  const all = [...rows.messages.map(messageEntry), ...rows.requests.map(requestEntry), ...rows.events.map(eventEntry)];
  return all.sort((left, right) => left.entry.at.localeCompare(right.entry.at) || left.entry.id.localeCompare(right.entry.id));
}
