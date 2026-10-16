import type { FlowCommands } from "./flowView";
import { DIRECT_KIND } from "./flowStages";
import { isReviewStep } from "./loopNames";
import { ACCEPT_PARTIAL_COPY, CONCLUDE_COPY, type ConcludeCopy } from "./stageCopy";
import type { FlowPlan, FlowRun } from "./unifiedContract";

export type ConcludeOffer = { onConclude: () => void; copy: ConcludeCopy };

const CONCLUDABLE_ACTION_STATES = ["failed", "canceled", "blocked"];
const BLOCKED_STATE = "blocked";
const PARTIAL_RESULT_CODE = "direct_partial";

function reviewOffer(plan: FlowPlan, commands: FlowCommands): ConcludeOffer | null {
  const review = plan.actions.find((action) => isReviewStep(action) && CONCLUDABLE_ACTION_STATES.includes(action.state));
  if (!review) return null;
  return { copy: CONCLUDE_COPY, onConclude: () => void commands.concludeReview({ actionId: review.id, expectedRevision: plan.revision }) };
}

function partialOffer(plan: FlowPlan, commands: FlowCommands, runs: FlowRun[]): ConcludeOffer | null {
  const direct = plan.actions.find((action) => action.kind === DIRECT_KIND && action.state === BLOCKED_STATE);
  const latest = direct ? runs.find((run) => run.actionId === direct.id) : null;
  if (!direct || latest?.terminalCode !== PARTIAL_RESULT_CODE) return null;
  return { copy: ACCEPT_PARTIAL_COPY, onConclude: () => void commands.acceptPartialDirect({ actionId: direct.id, expectedRevision: plan.revision }) };
}

export function concludeOffer(plan: FlowPlan | null, commands: FlowCommands, runs: FlowRun[] = []): ConcludeOffer | null {
  if (!plan) return null;
  return reviewOffer(plan, commands) ?? partialOffer(plan, commands, runs);
}

export function concludedByOperator(plan: FlowPlan | null) {
  return plan?.actions.some((action) => isReviewStep(action) && action.concludedAt !== null) ?? false;
}
