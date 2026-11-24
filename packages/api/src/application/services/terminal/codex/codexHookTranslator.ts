export type CodexHookNotification = { method: string; params: { threadId?: string; thread?: { id: string }; item?: CodexHookItem } };
export type CodexHookItem = { type: string; command?: string; changes?: CodexFileChange[] };
export type CodexFileChange = { path: string; kind: { type: "add" | "delete" } | { type: "update"; move_path: string | null }; diff: string };
export type CodexHookPayload = { hook_event_name: string; session_id: string; source?: string; prompt?: string; reason?: string; tool_name?: string; tool_input?: Record<string, unknown> };

const ITEM_COMPLETED = "item/completed";
const TURN_COMPLETED = "turn/completed";
const THREAD_STARTED = "thread/started";
const THREAD_RESUMED = "thread/resumed";
const THREAD_CLOSED = "thread/closed";

function fileHooks(threadId: string, changes: CodexFileChange[]): CodexHookPayload[] {
  return changes.flatMap((change) => {
    const changeKind = change.kind.type;
    const paths = changeKind === "update" && change.kind.move_path ? [change.path, change.kind.move_path] : [change.path];
    return paths.map((filePath) => ({ hook_event_name: "PostToolUse", session_id: threadId, tool_name: changeKind === "add" ? "Write" : "Edit", tool_input: { file_path: filePath, change_kind: changeKind === "update" && change.kind.move_path ? "move" : changeKind } }));
  });
}

function itemHooks(threadId: string, item: CodexHookItem | undefined): CodexHookPayload[] {
  if (item?.type === "commandExecution" && typeof item.command === "string") return [{ hook_event_name: "PostToolUse", session_id: threadId, tool_name: "Bash", tool_input: { command: item.command } }];
  if (item?.type === "fileChange" && Array.isArray(item.changes)) return fileHooks(threadId, item.changes);
  return [];
}

export function codexHookEvents(notification: CodexHookNotification, mainThreadId: string): CodexHookPayload[] {
  const threadId = notification.params.threadId ?? notification.params.thread?.id;
  if (threadId !== mainThreadId) return [];
  if (notification.method === THREAD_STARTED || notification.method === THREAD_RESUMED) return [{ hook_event_name: "SessionStart", session_id: mainThreadId, source: notification.method === THREAD_RESUMED ? "resume" : "startup" }];
  if (notification.method === THREAD_CLOSED) return [{ hook_event_name: "SessionEnd", session_id: mainThreadId, reason: "completed" }];
  if (notification.method === TURN_COMPLETED) return [{ hook_event_name: "Stop", session_id: mainThreadId }];
  if (notification.method === ITEM_COMPLETED) return itemHooks(mainThreadId, notification.params.item);
  return [];
}
