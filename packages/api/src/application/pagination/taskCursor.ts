import { createHmac, timingSafeEqual } from "node:crypto";
import { TaskError } from "../services/tasks/taskErrors";

type CursorPayload = { kind: "tasks" | "messages" | "revisions" | "spec_events" | "spec_packages" | "spec_blocks"; scope: string; position: string; id?: string; direction?: "after" | "before" };

export function encodeTaskCursor(payload: CursorPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeTaskCursor(value: string | undefined, kind: CursorPayload["kind"], scope: string, direction?: CursorPayload["direction"]) {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature || !safeSignature(body, signature)) throw new TaskError("invalid_cursor");
  let payload: CursorPayload;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CursorPayload; } catch { throw new TaskError("invalid_cursor"); }
  if (payload.kind !== kind || payload.scope !== scope || typeof payload.position !== "string" || payload.direction !== direction) throw new TaskError("invalid_cursor");
  return payload;
}

function safeSignature(body: string, signature: string) {
  try { return timingSafeEqual(Buffer.from(sign(body)), Buffer.from(signature)); } catch { return false; }
}

function sign(body: string) {
  const secret = process.env.TASK_CURSOR_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new TaskError("service_unavailable");
  return createHmac("sha256", secret).update(body).digest("base64url");
}
