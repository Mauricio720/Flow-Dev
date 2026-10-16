import { isReviewLoop } from "./loopOrder";

export const PULL_REQUEST_ACTION_KIND = "open_pull_request";
export const PULL_REQUEST_AGENT_NAME = "flow-publish";
export const PULL_REQUEST_SKILL_NAME = "flow-pull-request";

const SUCCEEDED_STATE = "succeeded";

export type ReviewedStep = { kind: string; loopName?: string | null; state?: string; concludedAt?: Date | string | null };

export const isPullRequestAction = (action: { kind: string }) => action.kind === PULL_REQUEST_ACTION_KIND;

/** A Review the operator concluded by hand never reached a clean round, so it does not release publication. */
export function reviewPassedCleanly(earlier: ReviewedStep[]) {
  const reviews = earlier.filter(isReviewLoop);
  return reviews.length > 0 && reviews.every((review) => review.state === SUCCEEDED_STATE && !review.concludedAt);
}
