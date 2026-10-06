export const PLANNING_MAX_DISPATCHES = 3;
export const PLANNING_LEASE_MS = 60_000;
export const PLANNING_DEADLINE_MS = 900_000;
export const PLANNING_REQUEST_DEADLINE_MS = 240_000;
const RETRY_DELAYS_SECONDS = [5, 15] as const;

export type PlanningClaimState = { operationId: string; executionId: string; fence: number; workerId: string; leaseUntil: Date; state: string };

export function isCurrentPlanningClaim(claim: PlanningClaimState, current: PlanningClaimState, now: Date) {
  return claim.operationId === current.operationId && claim.executionId === current.executionId && claim.fence === current.fence && claim.workerId === current.workerId && current.state === "running" && current.leaseUntil > now;
}

export function planningRetryDelay(input: { attempts: number; now: Date; deadline: Date; retryAfterSeconds?: number }) {
  const remaining = input.deadline.getTime() - input.now.getTime();
  if (input.attempts >= PLANNING_MAX_DISPATCHES) return { terminal: true as const, reason: "planning_provider_unavailable" };
  if (remaining < PLANNING_REQUEST_DEADLINE_MS) return { terminal: true as const, reason: "planning_deadline" };
  const seconds = input.retryAfterSeconds === undefined ? RETRY_DELAYS_SECONDS[input.attempts - 1] ?? 15 : Math.max(5, Math.min(60, input.retryAfterSeconds));
  return { terminal: false as const, nextRunAt: new Date(input.now.getTime() + seconds * 1_000) };
}
