import { decodeCursor, encodeCursor } from "../../pagination/cursor";
import { AssignedIssueError } from "./assignedIssueErrors";

export type CursorBinding = { projectId: string; actorId: string; boardId?: string };
type CursorPayload = { p: string; a: string; b?: string; c: unknown };

export function encodeBoundCursor(binding: CursorBinding, position: unknown) {
  const payload: CursorPayload = { p: binding.projectId, a: binding.actorId, b: binding.boardId, c: position };
  return encodeCursor({ key: JSON.stringify(payload) });
}

export function decodeBoundCursor(value: string | undefined, binding: CursorBinding): unknown {
  if (!value) return null;
  const parsed = parse(decodeCursor(value)?.key);
  if (!parsed || parsed.p !== binding.projectId || parsed.a !== binding.actorId || parsed.b !== binding.boardId) throw new AssignedIssueError("invalid_cursor");
  return parsed.c;
}

function parse(key: string | undefined): CursorPayload | null {
  try { return key ? JSON.parse(key) as CursorPayload : null; } catch { return null; }
}
