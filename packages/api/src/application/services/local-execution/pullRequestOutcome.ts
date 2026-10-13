import type { DirectFailure } from "./directOutcome";

export const PULL_REQUEST_OUTCOME_FILE = "_pull_request_outcome.md";
export const PULL_REQUEST_OUTCOME_STATUSES = ["OPENED", "BLOCKED"] as const;

type PullRequestStatus = (typeof PULL_REQUEST_OUTCOME_STATUSES)[number];

const STATUS_LINE = /^\s*status:\s*([A-Z_]+)\s*$/m;
const REASON_LINE = /^\s*reason:\s*(.+?)\s*$/m;
const URL_LINE = /^\s*url:\s*(https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+)\s*$/m;
const OPENED: PullRequestStatus = "OPENED";
const MISSING: DirectFailure = { outcome: "failed", reason: "pull_request_outcome_missing", detail: null };
const BLOCKED_REASON = "pull_request_blocked";

function statusOf(report: string): PullRequestStatus | null {
  const declared = STATUS_LINE.exec(report)?.[1];
  return PULL_REQUEST_OUTCOME_STATUSES.find((status) => status === declared) ?? null;
}

/** Null means the agent reported an open pull request with its address; anything else keeps the action from succeeding. */
export function pullRequestFailureOf(report: string | null): DirectFailure | null {
  if (report === null) return MISSING;
  const status = statusOf(report);
  if (!status) return MISSING;
  if (status === OPENED) return URL_LINE.test(report) ? null : MISSING;
  return { outcome: "blocked", reason: BLOCKED_REASON, detail: REASON_LINE.exec(report)?.[1] ?? null };
}
