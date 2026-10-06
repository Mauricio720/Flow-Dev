import type { ResolveRuntimeInteraction, RuntimeIdentity, RuntimeInteraction, RuntimeResolution } from "../../../application/spec/specRuntimeGateway";
import { mapResolution, UNKNOWN_RESOLUTION } from "../../../application/spec/specRuntimeOutcomes";
import { answerSchema, approveSchema, interactionsSchema, type CompozyInteraction } from "./compozySchemas";
import { callOk, send } from "./compozyCall";
import type { CompozyTransport } from "./compozyTransport";

const QUEUE_FULL_STATUS = 413;
const ALLOW_ONCE_CANDIDATES = ["allow_once", "approve_once", "approve", "allow"];
const DENY_ONCE_CANDIDATES = ["reject_once", "deny_once", "reject", "deny"];

const base = (identity: RuntimeIdentity) => `/api/workspaces/${encodeURIComponent(identity.workspaceId)}/sessions/${encodeURIComponent(identity.sessionId)}`;

export function toInteraction(raw: CompozyInteraction): RuntimeInteraction {
  const kind = raw.kind.includes("permission") ? "permission" : "question";
  return { id: raw.interaction_id, providerRequestId: raw.provider_request_id, turnId: raw.turn_id ?? null, kind, status: raw.status, title: raw.title ?? null, choices: raw.choices ?? [], decisions: raw.decisions ?? [], toolId: raw.tool_id ?? null, resolution: raw.resolution ?? null };
}

export async function listInteractions(transport: CompozyTransport, identity: RuntimeIdentity) {
  const body = await callOk(transport, { request: { method: "GET", path: `${base(identity)}/interactions` }, schema: interactionsSchema, accepted: [200] });
  return body.interactions.map(toInteraction);
}

export async function resolveInteraction(transport: CompozyTransport, input: ResolveRuntimeInteraction): Promise<RuntimeResolution> {
  return input.kind === "question" ? answerQuestion(transport, input) : decidePermission(transport, input);
}

async function answerQuestion(transport: CompozyTransport, input: Extract<ResolveRuntimeInteraction, { kind: "question" }>): Promise<RuntimeResolution> {
  const body = input.choiceIndex !== undefined ? { choice_index: input.choiceIndex } : { text: input.text };
  const response = await send(transport, { method: "POST", path: `${base(input)}/clarifications/${encodeURIComponent(input.requestId)}/answer`, body });
  if (response.status === QUEUE_FULL_STATUS) return mapResolution("queue-full");
  const parsed = response.status === 200 ? answerSchema.safeParse(response.body) : null;
  if (!parsed?.success) return reconcileResolution(transport, input);
  const record = await findRecord(transport, input);
  if (!record || record.status === "pending") return UNKNOWN_RESOLUTION;
  return mapResolution("answered", record.resolution ?? parsed.data.text);
}

async function decidePermission(transport: CompozyTransport, input: Extract<ResolveRuntimeInteraction, { kind: "permission" }>): Promise<RuntimeResolution> {
  const listed = (await listInteractions(transport, input)).find((item) => item.providerRequestId === input.requestId || item.id === input.requestId);
  const decision = pickDecision(listed?.decisions ?? [], input.decision);
  if (!decision) return mapResolution("rejected");
  const response = await send(transport, { method: "POST", path: `${base(input)}/approve`, body: { request_id: input.requestId, turn_id: input.turnId, decision } });
  if (response.status === QUEUE_FULL_STATUS) return mapResolution("queue-full");
  const parsed = response.status === 200 ? approveSchema.safeParse(response.body) : null;
  if (!parsed?.success) return reconcileResolution(transport, input);
  return mapResolution(parsed.data.outcome, parsed.data.resolved_decision ?? parsed.data.decision);
}

export function pickDecision(offered: string[], wanted: "allow_once" | "deny_once") {
  const candidates = wanted === "allow_once" ? ALLOW_ONCE_CANDIDATES : DENY_ONCE_CANDIDATES;
  return candidates.find((candidate) => offered.includes(candidate)) ?? null;
}

async function findRecord(transport: CompozyTransport, input: ResolveRuntimeInteraction) {
  const records = await listInteractions(transport, input).catch(() => null);
  return records?.find((item) => item.providerRequestId === input.requestId || item.id === input.requestId) ?? null;
}

async function reconcileResolution(transport: CompozyTransport, input: ResolveRuntimeInteraction): Promise<RuntimeResolution> {
  const record = await findRecord(transport, input);
  if (!record || record.status === "pending") return UNKNOWN_RESOLUTION;
  return mapResolution("already-resolved", record.resolution);
}
