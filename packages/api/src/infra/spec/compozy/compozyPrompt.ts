import type { RuntimeSubmission, SubmitSpecPrompt } from "../../../application/spec/specRuntimeGateway";
import { promptSchema } from "./compozySchemas";
import { send } from "./compozyCall";
import { SpecRuntimeError } from "./compozyErrors";
import type { CompozyTransport } from "./compozyTransport";

const ACCEPTED_STATUSES = [200, 202];
const CONFLICT_STATUS = 409;
const QUEUE_FULL_STATUS = 413;

export async function submitPrompt(transport: CompozyTransport, input: SubmitSpecPrompt): Promise<RuntimeSubmission> {
  const base = { messageId: input.messageId, idempotencyKey: input.idempotencyKey, turnId: null, replayed: false };
  const body = { message_id: input.messageId, idempotency_key: input.idempotencyKey, message: input.message, ...(input.provider ? { runtime: { provider: input.provider, ...(input.model ? { model: input.model } : {}) } } : {}) };
  const path = `/api/workspaces/${encodeURIComponent(input.workspaceId)}/sessions/${encodeURIComponent(input.sessionId)}/prompt`;
  const response = await send(transport, { method: "POST", path, body });
  if (ACCEPTED_STATUSES.includes(response.status)) return acceptedSubmission(base, response.body);
  if (response.status === QUEUE_FULL_STATUS) return { ...base, status: "queue_full" };
  if (response.status === CONFLICT_STATUS) return { ...base, status: "conflict" };
  throw new SpecRuntimeError(response.status >= 500 ? "outcome_unknown" : "runtime_failed", response.status >= 500);
}

function acceptedSubmission(base: Omit<RuntimeSubmission, "status">, body: unknown): RuntimeSubmission {
  const parsed = promptSchema.safeParse(body);
  if (!parsed.success) return { ...base, status: "unknown" };
  const { prompt } = parsed.data;
  return { ...base, status: "accepted", turnId: prompt.new_turn_id ?? prompt.turn_id ?? null, replayed: prompt.replayed };
}
