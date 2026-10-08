import type { RunActivity } from "../../../application/database/dao/taskFlowTypes";
import { normalizeSpecEvent } from "../../../application/services/spec/normalizeSpecEvent";
import { isCanceledStopReason } from "../../../application/spec/specRuntimeOutcomes";
import type { RuntimeCursor, SpecRuntimeGateway } from "../../../application/spec/specRuntimeGateway";

const ACTIVITY_PREVIEW_MAX_CHARS = 1200;
const DONE_TYPES = new Set(["done", "turn_done", "turn_completed"]);
const COMPLETED_STATUSES = new Set(["completed", "end_turn"]);

export type SnapshotTerminalState = "succeeded" | "canceled";

export function terminalStateFromActivity(activity: RunActivity | null | undefined): SnapshotTerminalState | null {
  if (activity?.kind !== "lifecycle" || !activity.status) return null;
  if (isCanceledStopReason(activity.status)) return "canceled";
  return COMPLETED_STATUSES.has(activity.status.toLowerCase()) ? "succeeded" : null;
}

export async function readSnapshotRunActivity(gateway: SpecRuntimeGateway, input: RuntimeCursor, workspaceRoot = "/workspace") {
  let sequence = input.afterSequence;
  let activity: RunActivity | null = null;
  let terminalState: SnapshotTerminalState | null = null;
  try {
    for await (const event of gateway.events(input)) {
      sequence = Math.max(sequence, event.sequence);
      const normalized = normalizeSpecEvent(event, workspaceRoot);
      if (!normalized || normalized.kind === "unsupported") continue;
      activity = { sequence: event.sequence, kind: normalized.kind, at: event.timestamp, preview: normalized.payload.preview.slice(0, ACTIVITY_PREVIEW_MAX_CHARS), tool: normalized.payload.tool?.slice(0, 100) ?? null, source: normalized.payload.source?.slice(0, 200) ?? null, status: normalized.payload.status?.slice(0, 100) ?? null };
      if (DONE_TYPES.has(event.type)) terminalState = terminalStateFromActivity(activity);
    }
  } catch {
    return { sequence, activity, terminalState };
  }
  return { sequence, activity, terminalState };
}
