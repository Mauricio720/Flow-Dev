import { AssignedIssueError } from "./assignedIssueErrors";
import type { ClaimState } from "./assignedIssueContracts";

export const DISPATCH_SETTLE_MS = 120_000;
export const HELD_CLAIM_STATES: ClaimState[] = ["pending", "uncertain", "claimed"];
export const UNRESOLVED_ATTEMPT_STATES = ["reserved", "dispatching", "uncertain"];

export function assertFence(attemptFence: number, storedFence: number) {
  if (attemptFence !== storedFence) throw new AssignedIssueError("stale_fence");
}

export function isHeld(state: ClaimState) {
  return HELD_CLAIM_STATES.includes(state);
}

export function isDispatchSettled(dispatchStartedAt: Date | null, now: Date) {
  return Boolean(dispatchStartedAt) && now.getTime() - dispatchStartedAt!.getTime() >= DISPATCH_SETTLE_MS;
}
