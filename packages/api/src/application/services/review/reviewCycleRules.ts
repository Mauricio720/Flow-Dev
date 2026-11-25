import { TaskError } from "../tasks/taskErrors";
import type { ReviewAction, ReviewCycleState, ReviewRole, ReviewStage, ReviewTransition } from "./reviewCycleTypes";

const NEXT_ROUND = 1;

type ReviewPosition = { state: ReviewCycleState; role: ReviewRole; round: number };

const ACTIONS_BY_STATE: Record<ReviewCycleState, ReviewAction[]> = {
  reviewing: ["stop"],
  executing: ["stop"],
  caveats: ["accept", "fix"],
  failed: ["retry", "stop"],
  approved: [],
  accepted: [],
  stopped: [],
};

type TransitionInput = Pick<ReviewTransition, "state" | "role" | "round"> & Partial<Pick<ReviewTransition, "verdict" | "ends">>;

function transition(input: TransitionInput): ReviewTransition {
  return { verdict: null, ends: false, ...input };
}

function invalidTransition(): never {
  throw new TaskError("review_action_invalid");
}

export function allowedActions(state: ReviewCycleState): ReviewAction[] {
  return [...ACTIONS_BY_STATE[state]];
}

export function applyAction(position: ReviewPosition, action: ReviewAction): ReviewTransition {
  if (!allowedActions(position.state).includes(action)) return invalidTransition();
  if (action === "stop") return transition({ state: "stopped", role: position.role, round: position.round, ends: true });
  if (position.state === "caveats" && action === "accept") return transition({ state: "accepted", role: position.role, round: position.round, ends: true });
  if (position.state === "caveats" && action === "fix") return transition({ state: "executing", role: "execute", round: position.round });
  if (action === "retry") return transition({ state: position.role === "review" ? "reviewing" : "executing", role: position.role, round: position.round });
  return invalidTransition();
}

function reviewStage(position: ReviewPosition, stage: ReviewStage): ReviewTransition {
  if (stage === "execute") return transition({ state: "executing", role: "execute", round: position.round, verdict: "rejected" });
  if (stage === "aprovada") return transition({ state: "approved", role: "review", round: position.round, verdict: "approved", ends: true });
  if (stage === "ressalvas") return transition({ state: "caveats", role: "review", round: position.round, verdict: "caveats" });
  return invalidTransition();
}

export function applyStage(position: ReviewPosition, stage: ReviewStage): ReviewTransition {
  if (position.role === "review" && (position.state === "reviewing" || position.state === "failed")) return reviewStage(position, stage);
  if (position.role === "execute" && (position.state === "executing" || position.state === "failed") && stage === "review") return transition({ state: "reviewing", role: "review", round: position.round + NEXT_ROUND });
  return invalidTransition();
}
