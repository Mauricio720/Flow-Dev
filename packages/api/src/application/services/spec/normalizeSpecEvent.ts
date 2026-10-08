import type { RuntimeEvent } from "../../spec/specRuntimeGateway";
import { SPEC_EVENT_DETAIL_MAX_BYTES, SPEC_EVENT_PREVIEW_MAX_BYTES } from "./specLimits";
import { redactText, redactValue } from "./specRedaction";
import { specTextByteLength } from "./specTextRules";

export type PublicEventKind = "agent_message" | "tool_call" | "tool_result" | "interaction" | "lifecycle" | "warning" | "unsupported";
export type NormalizedSpecEvent = {
  providerEventId: string;
  runtimeSequence: number;
  kind: PublicEventKind;
  payload: { text: string; preview: string; toolCallId: string | null; tool: string | null; source: string | null; status: string | null; durationMs: number | null; reason: string | null; originalType: string | null; omitted: string[] };
};

const PRIVATE_TYPES = new Set(["thought", "reasoning", "agent_thought", "thinking"]);
const LIFECYCLE_TYPES = new Set(["turn_started", "turn_completed", "turn_done", "done", "session_started", "stopped", "stop_requested"]);
const KIND_BY_TYPE: Record<string, PublicEventKind> = { agent_message: "agent_message", tool_call: "tool_call", tool_result: "tool_result", interaction: "interaction", clarification: "interaction", permission: "interaction", warning: "warning" };
const SIZE_OMISSION = "size_limit";

function field(content: unknown, ...names: string[]) {
  if (!content || typeof content !== "object") return null;
  const record = content as Record<string, unknown>;
  const found = names.map((name) => record[name]).find((candidate) => typeof candidate === "string");
  return (found as string | undefined) ?? null;
}

function numberField(content: unknown, ...names: string[]) {
  if (!content || typeof content !== "object") return null;
  const record = content as Record<string, unknown>;
  const found = names.map((name) => record[name]).find((candidate) => typeof candidate === "number");
  return (found as number | undefined) ?? null;
}

function textOf(content: unknown) {
  if (typeof content === "string") return content;
  return field(content, "text", "message", "output", "result", "title") ?? (content === null || content === undefined ? "" : JSON.stringify(content));
}

export function normalizeSpecEvent(event: RuntimeEvent, workspaceRoot: string | null = null): NormalizedSpecEvent | null {
  if (PRIVATE_TYPES.has(event.type)) return null;
  const omitted: string[] = [];
  const kind = classify(event.type);
  const safeContent = redactValue(event.content, workspaceRoot, omitted);
  const full = textOf(safeContent);
  const text = clip(full, SPEC_EVENT_DETAIL_MAX_BYTES, omitted);
  const source = field(safeContent, "source", "path", "file");
  const status = field(safeContent, "status", "state", "stop_reason", "prompt_stop_reason");
  const safeSource = source && !source.startsWith("/") && !source.includes("[caminho omitido]") ? source : null;
  const payload = { text: kind === "unsupported" ? "" : text, preview: clip(text, SPEC_EVENT_PREVIEW_MAX_BYTES, []), toolCallId: field(safeContent, "tool_call_id", "toolCallId"), tool: field(safeContent, "tool", "name"), source: safeSource, status, durationMs: numberField(safeContent, "duration_ms", "durationMs"), reason: field(safeContent, "reason", "error"), originalType: kind === "unsupported" ? redactText(event.type, workspaceRoot) : null, omitted: [...new Set(omitted)] };
  return { providerEventId: event.id, runtimeSequence: event.sequence, kind, payload };
}

function classify(type: string): PublicEventKind {
  if (LIFECYCLE_TYPES.has(type)) return "lifecycle";
  return KIND_BY_TYPE[type] ?? "unsupported";
}

function clip(text: string, maxBytes: number, omitted: string[]) {
  if (specTextByteLength(text) <= maxBytes) return text;
  omitted.push(SIZE_OMISSION);
  const bytes = Buffer.from(text, "utf8");
  let end = maxBytes;
  while (end > 0 && (bytes[end]! & 0xc0) === 0x80) end -= 1;
  return bytes.subarray(0, end).toString("utf8");
}
