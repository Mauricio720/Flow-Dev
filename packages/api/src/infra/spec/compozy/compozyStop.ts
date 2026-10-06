import type { RuntimeIdentity, RuntimeSnapshot, RuntimeStop } from "../../../application/spec/specRuntimeGateway";
import { mapStop } from "../../../application/spec/specRuntimeOutcomes";
import { sessionSchema, stopSchema } from "./compozySchemas";
import { parse, send } from "./compozyCall";
import { SpecRuntimeError } from "./compozyErrors";
import { listInteractions } from "./compozyInteractions";
import type { CompozyTransport } from "./compozyTransport";

const STOP_ACCEPTED = [200, 202];
const NOT_FOUND_STATUS = 404;
const NO_CONTENT_STATUS = 204;

const base = (identity: RuntimeIdentity) => `/api/workspaces/${encodeURIComponent(identity.workspaceId)}/sessions/${encodeURIComponent(identity.sessionId)}`;

export async function requestStop(transport: CompozyTransport, identity: RuntimeIdentity): Promise<RuntimeStop> {
  const response = await send(transport, { method: "POST", path: `${base(identity)}/stop`, body: { wait: false } });
  if (response.status === NO_CONTENT_STATUS) return mapStop({ state: "stopping", verified: false });
  if (response.status === NOT_FOUND_STATUS) throw new SpecRuntimeError("outcome_unknown", true, "stop target missing");
  if (!STOP_ACCEPTED.includes(response.status)) throw new SpecRuntimeError("outcome_unknown", true, `status ${response.status}`);
  const parsed = stopSchema.safeParse(response.body);
  if (!parsed.success) throw new SpecRuntimeError("outcome_unknown", true, "malformed stop response");
  return mapStop({ state: parsed.data.state, verified: parsed.data.verified, stopCause: parsed.data.stop_cause, attention: parsed.data.attention });
}

export async function inspectSession(transport: CompozyTransport, identity: RuntimeIdentity): Promise<RuntimeSnapshot> {
  const response = await send(transport, { method: "GET", path: base(identity) });
  if (response.status === NOT_FOUND_STATUS) throw new SpecRuntimeError("outcome_unknown", true, "session missing");
  if (response.status !== 200) throw new SpecRuntimeError(response.status >= 500 ? "outcome_unknown" : "runtime_failed", response.status >= 500);
  const { session } = parse(sessionSchema, response.body);
  const pendingInteractions = await listInteractions(transport, identity).catch(() => []);
  return { state: session.state, verified: session.verified ?? false, stopReason: session.stop_reason ?? null, stopCause: session.stop_cause ?? null, turnId: session.activity?.turn_id ?? null, attention: session.attention ?? null, pendingInteractions: pendingInteractions.filter((item) => item.status === "pending") };
}

export function snapshotToStop(snapshot: RuntimeSnapshot): RuntimeStop {
  return mapStop({ state: snapshot.state, verified: snapshot.verified, stopReason: snapshot.stopReason, stopCause: snapshot.stopCause, attention: snapshot.attention });
}
