import type { FlowCommands } from "./flowView";
import { isReviewStep } from "./loopNames";
import type { FlowPlan } from "./unifiedContract";

export type ConcludeOffer = { onConclude: () => void };

const CONCLUDABLE_ACTION_STATES = ["failed", "canceled", "blocked"];

export function concludeOffer(plan: FlowPlan | null, commands: FlowCommands): ConcludeOffer | null {
  const review = plan?.actions.find((action) => isReviewStep(action) && CONCLUDABLE_ACTION_STATES.includes(action.state));
  if (!plan || !review) return null;
  return { onConclude: () => void commands.concludeReview({ actionId: review.id, expectedRevision: plan.revision }) };
}

export function concludedByOperator(plan: FlowPlan | null) {
  return plan?.actions.some((action) => isReviewStep(action) && action.concludedAt !== null) ?? false;
}
