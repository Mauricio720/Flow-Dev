export type ReducibleEvent = { id: string; sequence: number; attemptId: string; kind: string; payload: { toolCallId?: string | null; status?: string | null; text?: string; preview?: string; source?: string | null; durationMs?: number | null; reason?: string | null; omitted?: string[]; tool?: string | null; hasFullText?: boolean } };
export type SpecEventEntry = { id: string; sequence: number; kind: string; attemptId: string; toolCallId: string | null; text: string; preview: string; result: string | null; status: string | null; source: string | null; durationMs: number | null; reason: string | null; omitted: string[]; tool: string | null; hasFullText: boolean };
export type SpecEventState = { entries: SpecEventEntry[]; cursor: number; lifecycle: { state: string | null; sequence: number } };
export type SnapshotVersioned = { specVersion: number };

export const emptyEventState: SpecEventState = { entries: [], cursor: 0, lifecycle: { state: null, sequence: 0 } };
const LIFECYCLE_KIND = "lifecycle";
const TOOL_RESULT_KIND = "tool_result";

export function reduceSpecEvents(state: SpecEventState, incoming: ReducibleEvent[]): SpecEventState {
  return [...incoming].sort((left, right) => left.sequence - right.sequence).reduce(applyEvent, state);
}

function applyEvent(state: SpecEventState, event: ReducibleEvent): SpecEventState {
  if (state.entries.some((entry) => entry.id === event.id)) return state;
  const joined = joinToolResult(state, event);
  const entries = joined ?? insertSorted(state.entries, toEntry(event));
  const lifecycle = nextLifecycle(state.lifecycle, event);
  return { entries, cursor: contiguousCursor(state.cursor, entries), lifecycle };
}

function toEntry(event: ReducibleEvent): SpecEventEntry {
  return { id: event.id, sequence: event.sequence, kind: event.kind, attemptId: event.attemptId, toolCallId: event.payload.toolCallId ?? null, text: event.payload.text ?? "", preview: event.payload.preview ?? event.payload.text ?? "", result: null, status: event.payload.status ?? null, source: event.payload.source ?? null, durationMs: event.payload.durationMs ?? null, reason: event.payload.reason ?? null, omitted: event.payload.omitted ?? [], tool: event.payload.tool ?? null, hasFullText: event.payload.hasFullText ?? false };
}

function joinToolResult(state: SpecEventState, event: ReducibleEvent) {
  const callId = event.payload.toolCallId;
  if (event.kind !== TOOL_RESULT_KIND || !callId) return null;
  const call = state.entries.find((entry) => entry.kind === "tool_call" && entry.toolCallId === callId);
  if (!call) return null;
  return state.entries.map((entry) => (entry === call ? { ...entry, result: event.payload.text ?? "", status: event.payload.status ?? entry.status, reason: event.payload.reason ?? entry.reason, durationMs: event.payload.durationMs ?? entry.durationMs, source: event.payload.source ?? entry.source } : entry));
}

function insertSorted(entries: SpecEventEntry[], entry: SpecEventEntry) {
  return [...entries, entry].sort((left, right) => left.sequence - right.sequence);
}

function contiguousCursor(current: number, entries: SpecEventEntry[]) {
  const known = new Set(entries.map((entry) => entry.sequence));
  let cursor = current;
  while (known.has(cursor + 1)) cursor += 1;
  return cursor;
}

function nextLifecycle(current: SpecEventState["lifecycle"], event: ReducibleEvent) {
  if (event.kind !== LIFECYCLE_KIND || event.sequence <= current.sequence) return current;
  return { state: event.payload.status ?? current.state, sequence: event.sequence };
}

export function acceptSnapshot<T extends SnapshotVersioned>(current: T | null, incoming: T): T {
  return current && incoming.specVersion < current.specVersion ? current : incoming;
}
