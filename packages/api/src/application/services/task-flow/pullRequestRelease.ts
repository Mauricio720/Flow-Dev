import { isDirectAction } from "./directExecution";
import type { FlowAction } from "./flowContracts";
import { isReviewLoop } from "./loopOrder";
import { isPullRequestAction, reviewPassedCleanly, type ReviewedStep } from "./pullRequestAction";
import { TaskFlowError } from "./taskFlowErrors";

const LOOP_KIND = "loop";
const LOCAL_WORKSPACE = "local";
const SUCCEEDED_STATE = "succeeded";

const writesCode = (action: FlowAction) => action.kind === LOOP_KIND || isDirectAction(action);

/** Publishing pushes the issue branch from the operator's worktree, so it closes the plan, follows the code it publishes and needs every code change to live in that worktree. */
export function assertPullRequestShape(actions: FlowAction[]) {
  const index = actions.findIndex(isPullRequestAction);
  if (index < 0) return;
  if (index !== actions.length - 1) throw new TaskFlowError("invalid_input");
  const earlier = actions.slice(0, index);
  if (!earlier.some(isReviewLoop) && !earlier.some(isDirectAction)) throw new TaskFlowError("stage_prerequisite");
  const codeActions = [...earlier.filter(writesCode), actions[index]!];
  if (codeActions.some((action) => action.workspace.kind !== LOCAL_WORKSPACE)) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "local_required" });
}

/** A direct execution publishes once it succeeded, including a partial result the operator accepted; the spec route still needs a clean Review. */
export function pullRequestReleased(earlier: ReviewedStep[]) {
  const direct = earlier.filter(isDirectAction);
  if (direct.length > 0) return direct.every((action) => action.state === SUCCEEDED_STATE);
  return reviewPassedCleanly(earlier);
}
