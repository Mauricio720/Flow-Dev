import { TaskError } from "../tasks/taskErrors";

export const CURSOR_LAG_MS = 2_000;

export function encodeCursor(since: Date): string {
  return Buffer.from(JSON.stringify({ t: since.getTime() })).toString("base64url");
}

export function decodeCursor(cursor: string): Date {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { t?: unknown };
    if (typeof parsed.t === "number" && Number.isFinite(parsed.t)) return new Date(parsed.t);
  } catch {
    throw new TaskError("invalid_cursor");
  }
  throw new TaskError("invalid_cursor");
}
