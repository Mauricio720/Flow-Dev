import type { TaskMessage, ToolActivity } from "./contract";

export type ThreadEntry =
  | { kind: "user"; id: string; text: string; at: string }
  | { kind: "question"; id: string; text: string; at: string }
  | { kind: "draft-note"; id: string; title: string; at: string }
  | { kind: "activity"; id: string; calls: ToolActivity[] };

const USER_ROLE = "user";
const ACTIVITY_PREFIX = "activity-";

function generatedTitle(content: string) {
  try {
    const value: unknown = JSON.parse(content);
    return value && typeof value === "object" && "title" in value && typeof value.title === "string" ? value.title : null;
  } catch {
    return null;
  }
}

function messageEntry(message: TaskMessage): ThreadEntry {
  if (message.role === USER_ROLE) return { kind: "user", id: message.id, text: message.content, at: message.createdAt };
  const title = generatedTitle(message.content);
  if (title === null) return { kind: "question", id: message.id, text: message.content, at: message.createdAt };
  return { kind: "draft-note", id: message.id, title, at: message.createdAt };
}

function activityEntry(operationId: string, activity: ToolActivity[]): ThreadEntry[] {
  const calls = activity.filter((call) => call.operationId === operationId);
  return calls.length ? [{ kind: "activity", id: `${ACTIVITY_PREFIX}${operationId}`, calls }] : [];
}

export function threadEntries(messages: TaskMessage[], activity: ToolActivity[]): ThreadEntry[] {
  return messages.flatMap((message) => {
    const entry = messageEntry(message);
    return entry.kind === "user" && message.operationId ? [entry, ...activityEntry(message.operationId, activity)] : [entry];
  });
}

export function failedOperationId(messages: TaskMessage[]) {
  return messages.findLast((message) => message.role === USER_ROLE)?.operationId ?? null;
}
