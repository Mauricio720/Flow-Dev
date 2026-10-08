import type { SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import { normalizeSpecEvent } from "../application/services/spec/normalizeSpecEvent";
import type { RuntimeIdentity } from "../application/spec/specRuntimeGateway";
import type { SpecWorkerDeps } from "./specWorkerTypes";

const DONE_TYPES = new Set(["done", "turn_done", "turn_completed"]);
const CANCELED_REASONS = new Set(["canceled", "cancelled", "user_canceled"]);

export type IngestResult = { done: boolean; canceled: boolean; gap: boolean; lastSequence: number | null };

export async function ingestEvents(deps: SpecWorkerDeps, claim: SpecClaim, identity: RuntimeIdentity): Promise<IngestResult> {
  const known = claim.runtimeCursor === null ? null : Number(claim.runtimeCursor);
  let last = known;
  let done = false;
  let canceled = false;
  for await (const event of deps.runtime.events({ ...identity, afterSequence: known ?? 0 })) {
    if (last !== null && event.sequence <= last) continue;
    if (last !== null && event.sequence > last + 1) return { done, canceled, gap: true, lastSequence: last };
    const normalized = normalizeSpecEvent(event, deps.settings.workspaceRoot);
    if (normalized) await deps.dao.appendEvent(claim, { kind: normalized.kind, payload: normalized.payload, providerEventId: normalized.providerEventId });
    last = event.sequence;
    await deps.dao.advanceCursor(claim, last);
    done = done || DONE_TYPES.has(event.type);
    canceled = canceled || isCanceledDone(event.type, event.content);
  }
  return { done, canceled, gap: false, lastSequence: last };
}

function isCanceledDone(type: string, content: unknown) {
  if (!DONE_TYPES.has(type) || !content || typeof content !== "object") return false;
  const value = content as Record<string, unknown>;
  const reason = value.stop_reason ?? value.prompt_stop_reason;
  return typeof reason === "string" && CANCELED_REASONS.has(reason.toLowerCase());
}
