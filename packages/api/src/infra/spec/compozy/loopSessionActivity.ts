import { z } from "zod";
import type { RunActivity } from "../../../application/database/dao/taskFlowTypes";
import { normalizeSpecEvent } from "../../../application/services/spec/normalizeSpecEvent";
import { redactText } from "../../../application/services/spec/specRedaction";
import { eventsSchema } from "./compozySchemas";
import type { ControlCaller } from "./controlCaller";

const RECENT_EVENT_LIMIT = 100;
const PREVIEW_LIMIT = 1200;
const ERROR_EVENT = "error";
const KNOWN_ERRORS = ["usage_limit_exceeded", "provider_rate_limited", "provider_auth_required"];
const sessionEventsSchema = z.object({ events: z.array(eventsSchema.shape.events.element.extend({
  failure: z.object({ summary: z.string().optional() }).nullish(),
  provider_error: z.object({ code: z.string(), guidance: z.string().optional() }).nullish(),
})) });
type SessionEvent = z.infer<typeof sessionEventsSchema>["events"][number];

function errorMessage(event: SessionEvent) {
  if (event.failure?.summary) return event.failure.summary;
  if (typeof event.content === "string") return event.content;
  if (!event.content || typeof event.content !== "object") return event.provider_error?.guidance ?? "O agente informou uma falha.";
  const content = event.content as Record<string, unknown>;
  return [content.error, content.message, content.text].find((value): value is string => typeof value === "string") ?? event.provider_error?.guidance ?? "O agente informou uma falha.";
}

function publicPreview(activity: { kind: string; preview: string }) {
  if (!activity.preview.trim().startsWith("{") && !activity.preview.trim().startsWith("[")) return activity.preview;
  try { JSON.parse(activity.preview); } catch { return activity.preview; }
  if (activity.kind === "tool_call") return "A ferramenta foi iniciada.";
  if (activity.kind === "tool_result") return "A ferramenta retornou uma atualização.";
  return "O agente enviou um resultado estruturado.";
}

function activityOf(event: SessionEvent): RunActivity | null {
  if (event.type === ERROR_EVENT) {
    const preview = redactText(errorMessage(event), null).slice(0, PREVIEW_LIMIT);
    const code = /usage_limit_exceeded|hit your usage limit/i.test(preview) ? "usage_limit_exceeded" : event.provider_error?.code;
    return { sequence: event.sequence, at: event.timestamp, kind: "warning", preview, tool: null, source: null, status: code && KNOWN_ERRORS.includes(code) ? code : "runtime_failed" };
  }
  const normalized = normalizeSpecEvent({ ...event, turnId: event.turn_id });
  if (!normalized || normalized.kind === "unsupported" || normalized.kind === "lifecycle") return null;
  const { payload } = normalized;
  return { sequence: event.sequence, at: event.timestamp, kind: normalized.kind, preview: publicPreview({ kind: normalized.kind, preview: payload.preview }).slice(0, PREVIEW_LIMIT), tool: payload.tool, source: payload.source, status: payload.status };
}

export async function readLoopSessionActivity(caller: ControlCaller, input: { workspaceId: string; sessionId: string; failed: boolean }) {
  const query = new URLSearchParams({ limit: String(RECENT_EVENT_LIMIT) });
  const path = `/api/workspaces/${encodeURIComponent(input.workspaceId)}/sessions/${encodeURIComponent(input.sessionId)}/events?${query}`;
  const result = await caller.guarded({ method: "GET", path }, sessionEventsSchema, (body) => body.events);
  if (!result.ok) return null;
  const activities = [...result.value].sort((first, second) => second.sequence - first.sequence).map(activityOf).filter((activity): activity is RunActivity => activity !== null);
  return (input.failed ? activities.find((activity) => activity.kind === "warning") : null) ?? activities[0] ?? null;
}
