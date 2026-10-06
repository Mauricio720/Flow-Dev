import type { SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import { normalizeSpecEvent } from "../application/services/spec/normalizeSpecEvent";
import type { RuntimeIdentity } from "../application/spec/specRuntimeGateway";
import type { SpecWorkerDeps } from "./specWorkerTypes";

const DONE_TYPES = new Set(["done", "turn_done", "turn_completed"]);

export type IngestResult = { done: boolean; gap: boolean; lastSequence: number | null };

export async function ingestEvents(deps: SpecWorkerDeps, claim: SpecClaim, identity: RuntimeIdentity): Promise<IngestResult> {
  const known = claim.runtimeCursor === null ? null : Number(claim.runtimeCursor);
  let last = known;
  let done = false;
  for await (const event of deps.runtime.events({ ...identity, afterSequence: known ?? 0 })) {
    if (last !== null && event.sequence <= last) continue;
    if (last !== null && event.sequence > last + 1) return { done, gap: true, lastSequence: last };
    const normalized = normalizeSpecEvent(event, deps.settings.workspaceRoot);
    if (normalized) await deps.dao.appendEvent(claim, { kind: normalized.kind, payload: normalized.payload, providerEventId: normalized.providerEventId });
    last = event.sequence;
    await deps.dao.advanceCursor(claim, last);
    done = done || DONE_TYPES.has(event.type);
  }
  return { done, gap: false, lastSequence: last };
}
