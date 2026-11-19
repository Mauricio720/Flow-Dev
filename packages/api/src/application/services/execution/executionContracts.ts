export const executionStates = ["dispatching", "unavailable", "spec_in_progress", "spec_review", "in_progress", "needs_attention", "completed", "failed", "canceled", "rejected"] as const;
export type ExecutionState = (typeof executionStates)[number];
export const specDecisions = ["approve", "request_changes", "reject"] as const;
export type SpecDecision = (typeof specDecisions)[number];
