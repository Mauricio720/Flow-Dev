export const DIRECT_OUTCOME_FILE = "_direct_outcome.md";
export const DIRECT_OUTCOME_STATUSES = ["COMPLETED", "PARTIAL", "BLOCKED", "ROUTING_MISMATCH"] as const;

export type DirectOutcomeStatus = (typeof DIRECT_OUTCOME_STATUSES)[number];
export type DirectFailure = { outcome: "failed" | "blocked"; reason: string; detail: string | null };

const STATUS_LINE = /^\s*status:\s*([A-Z_]+)\s*$/m;
const REASON_LINE = /^\s*reason:\s*(.+?)\s*$/m;
const COMPLETED = "COMPLETED";
export const DIRECT_PARTIAL_REASON = "direct_partial";
const MISSING: DirectFailure = { outcome: "failed", reason: "direct_outcome_missing", detail: null };
const BLOCKED_REASONS: Record<Exclude<DirectOutcomeStatus, "COMPLETED">, string> = {
  PARTIAL: DIRECT_PARTIAL_REASON,
  BLOCKED: "direct_blocked",
  ROUTING_MISMATCH: "routing_mismatch",
};

function statusOf(report: string): DirectOutcomeStatus | null {
  const declared = STATUS_LINE.exec(report)?.[1];
  return DIRECT_OUTCOME_STATUSES.find((status) => status === declared) ?? null;
}

/** Null means the executor declared the work complete; anything else keeps the action from succeeding. */
export function directFailureOf(report: string | null): DirectFailure | null {
  if (report === null) return MISSING;
  const status = statusOf(report);
  if (!status) return MISSING;
  if (status === COMPLETED) return null;
  return { outcome: "blocked", reason: BLOCKED_REASONS[status], detail: REASON_LINE.exec(report)?.[1] ?? null };
}
