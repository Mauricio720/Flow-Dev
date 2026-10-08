export const IMPLEMENT_LOOP = "implement-tasks";
export const REVIEW_LOOP = "review-and-fix";

const LOOP_KIND = "loop";
const SUCCEEDED_STATE = "succeeded";

type Step = { kind: string; loopName?: string | null; state?: string };

const isLoop = (step: Step, name: string) => step.kind === LOOP_KIND && step.loopName === name;

export const isReviewLoop = (step: Step) => isLoop(step, REVIEW_LOOP);

export function reviewFollowsImplementation(steps: Step[]) {
  const firstReview = steps.findIndex(isReviewLoop);
  return firstReview < 0 || steps.slice(0, firstReview).some((step) => isLoop(step, IMPLEMENT_LOOP));
}

export function implementationConcluded(earlier: Step[]) {
  return earlier.some((step) => isLoop(step, IMPLEMENT_LOOP) && step.state === SUCCEEDED_STATE);
}
