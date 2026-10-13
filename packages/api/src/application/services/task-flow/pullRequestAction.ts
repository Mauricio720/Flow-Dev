import type { FlowAction } from "./flowContracts";
import { isReviewLoop } from "./loopOrder";
import { TaskFlowError } from "./taskFlowErrors";

export const PULL_REQUEST_ACTION_KIND = "open_pull_request";
export const PULL_REQUEST_AGENT_NAME = "flow-publish";
export const PULL_REQUEST_SKILL_NAME = "flow-pull-request";

const LOOP_KIND = "loop";
const LOCAL_WORKSPACE = "local";
const SUCCEEDED_STATE = "succeeded";

type ReviewedStep = { kind: string; loopName?: string | null; state?: string; concludedAt?: Date | string | null };

export const isPullRequestAction = (action: { kind: string }) => action.kind === PULL_REQUEST_ACTION_KIND;

/** Publishing pushes the issue branch from the operator's worktree, so it closes the plan, follows a Review and needs every code change to live in that worktree. */
export function assertPullRequestShape(actions: FlowAction[]) {
  const index = actions.findIndex(isPullRequestAction);
  if (index < 0) return;
  if (index !== actions.length - 1) throw new TaskFlowError("invalid_input");
  const earlier = actions.slice(0, index);
  if (!earlier.some(isReviewLoop)) throw new TaskFlowError("stage_prerequisite");
  const codeActions = [...earlier.filter((action) => action.kind === LOOP_KIND), actions[index]!];
  if (codeActions.some((action) => action.workspace.kind !== LOCAL_WORKSPACE)) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "local_required" });
}

/** A Review the operator concluded by hand never reached a clean round, so it does not release publication. */
export function reviewPassedCleanly(earlier: ReviewedStep[]) {
  const reviews = earlier.filter(isReviewLoop);
  return reviews.length > 0 && reviews.every((review) => review.state === SUCCEEDED_STATE && !review.concludedAt);
}
