export const LOOP_KIND = "loop";
export const IMPLEMENT_LOOP = "implement-tasks";
export const REVIEW_LOOP = "review-and-fix";
export const TASK_TARGET_INPUTS: Record<string, string> = { [IMPLEMENT_LOOP]: "slug", [REVIEW_LOOP]: "task_name" };

export type FlowStep = { kind: string; loopName?: string | null };

export const isReviewStep = (step: FlowStep) => step.kind === LOOP_KIND && step.loopName === REVIEW_LOOP;
