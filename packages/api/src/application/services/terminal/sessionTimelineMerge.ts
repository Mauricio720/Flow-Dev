import type { TimelineEventRow, TimelineRows } from "../../database/dao/sessionTimelineDao";
import type { PermissionDecision, PermissionPayload, PermissionRequestKind, QuestionPayload } from "../../terminal/sessionInteraction";
import type { SessionMessageRecord, SessionRequestRecord } from "../../terminal/sessionInteractionPorts";
import { parseRouteSwitchBlock } from "./routeSwitchBlock";
import { toRouteSwitchView } from "./routeSwitchView";

export type TimelineEntry =
  | { type: "message"; id: string; role: SessionMessageRecord["role"]; content: string; truncated: boolean; queued: boolean; undelivered: boolean; at: string }
  | { type: "event"; id: string; kind: TimelineEventRow["kind"]; summary: string; at: string }
  | { type: "route_switch"; id: string; proposal: ReturnType<typeof toRouteSwitchView>; at: string }
  | { type: "question"; id: string; status: SessionRequestRecord["status"]; questions: QuestionPayload["questions"]; answers?: Record<string, string | string[]>; at: string }
  | { type: "permission"; id: string; status: SessionRequestRecord["status"]; kind: PermissionRequestKind; offers: PermissionDecision[]; alwaysScope: "project" | "machine" | null; tool: string; display: { title: string; body: string }; suggestedRule: string | null; decision?: string; reason?: string; at: string };

type Ordered = { entry: TimelineEntry; changedAt: Date };

function messageEntry(message: SessionMessageRecord): Ordered {
  const queued = message.role === "user" && message.deliveredAt === null && !message.undelivered;
  const changedAt = message.deliveredAt && message.deliveredAt > message.occurredAt ? message.deliveredAt : message.occurredAt;
  const content = message.role === "assistant" ? parseRouteSwitchBlock(message.content).text : message.content;
  return { changedAt, entry: { type: "message", id: message.id, role: message.role, content, truncated: message.truncated, queued, undelivered: message.undelivered, at: message.occurredAt.toISOString() } };
}

function routeSwitchEntry(record: TimelineRows["routeSwitches"][number], status: TimelineRows["sessionStatus"]): Ordered {
  return { changedAt: record.decidedAt ?? record.proposedAt, entry: { type: "route_switch", id: record.id, proposal: toRouteSwitchView(record, status), at: record.proposedAt.toISOString() } };
}

function requestEntry(request: SessionRequestRecord): Ordered {
  const changedAt = request.answeredAt ?? request.createdAt;
  const at = request.createdAt.toISOString();
  const answer = (request.answer ?? {}) as { answers?: Record<string, string | string[]>; decision?: string; reason?: string };
  if (request.kind === "question") {
    const questions = (request.payload as QuestionPayload).questions.map((question) => ({ ...question, id: question.id ?? question.question, secret: question.secret ?? false, allowOther: question.allowOther ?? true }));
    const base = { type: "question" as const, id: request.id, status: request.status, questions, at };
    return { changedAt, entry: request.status === "answered" && answer.answers ? { ...base, answers: answer.answers } : base };
  }
  const payload = request.payload as PermissionPayload;
  const kind = payload.permissionKind ?? (request.kind === "file_change" || request.kind === "extra_permission" ? request.kind : "command");
  const offers: PermissionDecision[] = payload.offers ?? (kind === "command" ? ["allow", "allow_always", "deny"] : kind === "file_change" ? ["allow", "allow_session", "deny"] : ["allow", "deny"]);
  const alwaysScope = payload.alwaysScope ?? (kind === "command" ? "project" : null);
  const base = { type: "permission" as const, id: request.id, status: request.status, kind, offers, alwaysScope, tool: payload.toolName, display: { title: payload.title, body: payload.body }, suggestedRule: payload.suggestedRule, at };
  return { changedAt, entry: request.status === "answered" && answer.decision ? { ...base, decision: answer.decision, ...(answer.reason ? { reason: answer.reason } : {}) } : base };
}

function eventEntry(event: TimelineEventRow): Ordered {
  return { changedAt: event.occurredAt, entry: { type: "event", id: event.id, kind: event.kind, summary: event.summary, at: event.occurredAt.toISOString() } };
}

export function mergeTimeline(rows: TimelineRows): Ordered[] {
  const all = [...rows.messages.map(messageEntry), ...rows.requests.map(requestEntry), ...rows.events.map(eventEntry), ...rows.routeSwitches.map((row) => routeSwitchEntry(row, rows.sessionStatus))];
  return all.sort((left, right) => left.entry.at.localeCompare(right.entry.at) || left.entry.id.localeCompare(right.entry.id));
}
