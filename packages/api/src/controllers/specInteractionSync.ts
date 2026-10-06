import type { DeliveryRecord, PendingDelivery, SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import { draftInteraction } from "../application/services/spec/specInteractionRules";
import type { ResolveRuntimeInteraction, RuntimeIdentity, RuntimeResolution } from "../application/spec/specRuntimeGateway";
import { SpecRuntimeError } from "../infra/spec/compozy/compozyErrors";
import type { SpecWorkerDeps } from "./specWorkerTypes";

const PENDING_STATUS = "pending";
const WAITING_STATE = "waiting";

export async function syncInteractions(deps: SpecWorkerDeps, claim: SpecClaim, identity: RuntimeIdentity) {
  const listed = (await deps.runtime.interactions(identity)).filter((item) => item.status === PENDING_STATUS);
  let kind: "question" | "permission" | null = null;
  for (const item of listed) {
    const draft = draftInteraction(item, { sessionId: identity.sessionId, workspaceRoot: deps.settings.workspaceRoot });
    const saved = await deps.dao.saveInteraction(claim, draft);
    if (saved.created && draft.status === "blocked") await deps.dao.appendEvent(claim, { kind: "interaction.blocked", payload: { interactionId: saved.id, diagnostic: "incomplete_interaction" } });
    if (draft.status === PENDING_STATUS) kind = kind === "permission" ? kind : draft.kind;
  }
  if (kind && claim.state !== WAITING_STATE) await deps.dao.markWaiting(claim, kind);
  return kind;
}

function toRequest(identity: RuntimeIdentity, delivery: PendingDelivery): ResolveRuntimeInteraction {
  const response = delivery.response as { choiceIndex?: number; text?: string; decision?: "allow_once" | "deny_once" };
  if (delivery.kind === "permission") return { ...identity, kind: "permission", requestId: delivery.providerRequestId, turnId: delivery.runtimeTurnId, decision: response.decision! };
  return { ...identity, kind: "question", requestId: delivery.providerRequestId, ...(response.choiceIndex !== undefined ? { choiceIndex: response.choiceIndex } : { text: response.text }) };
}

export function deliveryRecord(resolution: RuntimeResolution, delivery: PendingDelivery): DeliveryRecord {
  if (resolution.delivered) return { delivery: "delivered", reason: null };
  if (resolution.outcome === "queue_full") return { delivery: "pending", reason: "interaction_queue_full" };
  if (resolution.outcome === "resolved_after_restart") return { delivery: "orphaned", reason: null };
  if (resolution.outcome === "already_resolved") return alreadyResolved(resolution, delivery);
  if (resolution.outcome === "rejected") return { delivery: "inactive", reason: "invalid_permission" };
  return { delivery: "unknown", reason: "outcome_unknown" };
}

function alreadyResolved(resolution: RuntimeResolution, delivery: PendingDelivery): DeliveryRecord {
  const ours = String(delivery.response.decision ?? delivery.response.value ?? "");
  const sameWinner = resolution.winningValue !== null && resolution.winningValue === ours;
  return sameWinner ? { delivery: "delivered", reason: null } : { delivery: "inactive", reason: null, runtimeWinner: resolution.winningValue };
}

export async function deliverResolutions(deps: SpecWorkerDeps, claim: SpecClaim, identity: RuntimeIdentity) {
  for (const delivery of await deps.dao.pendingDeliveries(claim)) {
    const record = await resolveOne(deps, identity, delivery);
    await deps.dao.recordDelivery(claim, { interactionId: delivery.interactionId, commandId: delivery.commandId, record });
  }
  const remaining = await deps.dao.pendingInteractionCount(claim);
  if (remaining === 0 && claim.state === WAITING_STATE) await deps.dao.markRunning(claim);
}

async function resolveOne(deps: SpecWorkerDeps, identity: RuntimeIdentity, delivery: PendingDelivery): Promise<DeliveryRecord> {
  try { return deliveryRecord(await deps.runtime.resolve(toRequest(identity, delivery)), delivery); }
  catch (error) {
    if (error instanceof SpecRuntimeError) return { delivery: "unknown", reason: "outcome_unknown" };
    throw error;
  }
}
