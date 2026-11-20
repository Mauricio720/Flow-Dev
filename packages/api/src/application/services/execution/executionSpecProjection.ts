import type { CompozyTaskState } from "../../compozy/compozyGateway";
import type { ExecutionState } from "./executionContracts";
import { DELIVERY_AGENT, EXECUTION_MAX_ATTEMPTS, SPEC_AGENT } from "./executionPlan";
import { projectExecution, type Projection } from "./executionProjection";

const APPROVED_OUTCOME = "approved";
const COMPLETED_STATUS = "completed";
const CANCELED_STATUS = "canceled";
const IN_PROGRESS_STATE = "in_progress";
const SPEC_REVIEW_STATE = "spec_review";
const SPEC_IN_PROGRESS_STATE = "spec_in_progress";
const FAILED_STATE = "failed";
const NEEDS_ATTENTION_STATE = "needs_attention";

type SpecProjectionInput = { specTask: CompozyTaskState; deliveryTask: CompozyTaskState; pullRequestUrl: string | null; currentState: ExecutionState; specRound: number };

export function projectSpecExecution(input: SpecProjectionInput): Projection {
  const spec = projectExecution({ task: input.specTask, maxAttempts: EXECUTION_MAX_ATTEMPTS, agent: SPEC_AGENT, pullRequestUrl: null });
  if (input.specTask.status === CANCELED_STATUS || input.deliveryTask.status === CANCELED_STATUS) return { ...spec, state: "canceled", action: null };
  if (!isApprovedCurrentRound(input.specTask, input.specRound)) return specInProgress(spec);
  if (!input.deliveryTask.latestRun) return { ...spec, state: waitingState(input.currentState), action: null };
  return projectExecution({ task: input.deliveryTask, maxAttempts: EXECUTION_MAX_ATTEMPTS, agent: DELIVERY_AGENT, pullRequestUrl: input.pullRequestUrl });
}

function isApprovedCurrentRound(task: CompozyTaskState, specRound: number) {
  const run = task.latestRun;
  if (!run || run.attempt < specRound) return false;
  return run.status === COMPLETED_STATUS && task.latestReview?.runId === run.runId && task.latestReview.outcome === APPROVED_OUTCOME;
}

function waitingState(currentState: ExecutionState) {
  return currentState === IN_PROGRESS_STATE ? IN_PROGRESS_STATE : SPEC_REVIEW_STATE;
}

function specInProgress(projection: Projection): Projection {
  if (projection.state === CANCELED_STATUS || projection.state === FAILED_STATE || projection.state === NEEDS_ATTENTION_STATE) return projection;
  return { ...projection, state: SPEC_IN_PROGRESS_STATE };
}
