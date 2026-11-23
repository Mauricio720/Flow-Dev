import type { ArtifactCaptureTrigger } from "../../terminal/artifactCaptureTrigger";
import { clip } from "./hookSummaryLimits";
import { summarizeToolEvent, type SummarizedEvent } from "./hookToolEvents";
import { parseSkillCommand } from "./skillCommand";

export type SummarizedHookEvent = {
  events: SummarizedEvent[];
  claudeSessionId: string | null;
  endReason: string | null;
  captureTrigger: ArtifactCaptureTrigger | null;
};

const DEFAULT_START_SOURCE = "startup";
const DEFAULT_END_REASON = "other";
const CLEAR_END_REASON = "clear";

const NO_EVENTS: SummarizedHookEvent = { events: [], claudeSessionId: null, endReason: null, captureTrigger: null };

function textField(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" ? value : null;
}

function objectField(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function simpleEvent(kind: SummarizedEvent["kind"], summary: string): SummarizedEvent {
  return { kind, summary, path: null, skill: null };
}

function promptEvents(prompt: string | null): SummarizedEvent[] {
  if (prompt === null) return [];
  const events = [simpleEvent("prompt", clip(prompt))];
  const skill = parseSkillCommand(prompt);
  if (skill) events.push({ kind: "skill", summary: skill, path: null, skill });
  return events;
}

function sessionEnd(reason: string): Pick<SummarizedHookEvent, "events" | "endReason" | "captureTrigger"> {
  if (reason === CLEAR_END_REASON) return { events: [], endReason: null, captureTrigger: "session_end" };
  return { events: [simpleEvent("ended", clip(reason))], endReason: reason, captureTrigger: "session_end" };
}

function eventsOf(hook: Record<string, unknown>, checkoutPath: string): Omit<SummarizedHookEvent, "claudeSessionId"> {
  const none = { events: [], endReason: null, captureTrigger: null };
  switch (hook.hook_event_name) {
    case "SessionStart": return { ...none, events: [simpleEvent("started", clip(textField(hook, "source") ?? DEFAULT_START_SOURCE))] };
    case "UserPromptSubmit": return { ...none, events: promptEvents(textField(hook, "prompt")) };
    case "PostToolUse": return { ...none, events: summarizeToolEvent({ toolName: textField(hook, "tool_name") ?? "", toolInput: objectField(hook, "tool_input"), checkoutPath }) };
    case "Stop": return { ...none, events: [simpleEvent("waiting", "")], captureTrigger: "stop" };
    case "Notification": return { ...none, events: [simpleEvent("attention", clip(textField(hook, "message") ?? ""))] };
    case "SessionEnd": return sessionEnd(textField(hook, "reason") ?? DEFAULT_END_REASON);
    default: return none;
  }
}

export function summarizeHookEvent(payload: unknown, checkoutPath: string): SummarizedHookEvent {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return NO_EVENTS;
  const hook = payload as Record<string, unknown>;
  const summarized = eventsOf(hook, checkoutPath);
  return { ...summarized, claudeSessionId: textField(hook, "session_id") };
}
