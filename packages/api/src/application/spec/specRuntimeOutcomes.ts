import type { RuntimeOutcome, RuntimeResolution, RuntimeStop } from "./specRuntimeGateway";

const OUTCOMES: Record<string, RuntimeOutcome> = {
  applied: "applied",
  answered: "answered",
  "already-resolved": "already_resolved",
  "resolved-after-restart": "resolved_after_restart",
  "queue-full": "queue_full",
  rejected: "rejected",
};
const LIVE_OUTCOMES: readonly RuntimeOutcome[] = ["applied", "answered"];

export function mapResolution(raw: string, winningValue: string | null = null): RuntimeResolution {
  const outcome = OUTCOMES[raw] ?? "unknown";
  const delivered = LIVE_OUTCOMES.includes(outcome);
  const reason = outcome === "queue_full" ? "interaction_queue_full" : outcome === "unknown" ? "outcome_unknown" : null;
  return { outcome, delivered, liveDeliveryProven: delivered, orphaned: outcome === "resolved_after_restart", winningValue, reason };
}

export const UNKNOWN_RESOLUTION: RuntimeResolution = mapResolution("");

type StopInput = { state: RuntimeStop["state"]; verified: boolean; stopReason?: string | null; stopCause?: string | null; attention?: string | null };
const CANCELED_REASON = "user_canceled";

export function mapStop(input: StopInput): RuntimeStop {
  const settled = input.state === "stopped" && input.verified;
  const cause = input.stopReason ?? input.stopCause ?? null;
  return { state: input.state, verified: input.verified, cause, attention: input.attention ?? null, settled, canceled: settled && cause === CANCELED_REASON };
}
