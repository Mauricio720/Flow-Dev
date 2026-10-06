import { SPEC_JOB_LEASE_SECONDS } from "./specLimits";
import { TaskError } from "../tasks/taskErrors";

const MILLISECONDS_PER_SECOND = 1000;
export const STOP_ATTENTION_AFTER_SECONDS = 60;
export const STOP_ATTENTION = "stop_unverified";

export function assertCurrentFence(claimFence: number, currentFence: number) {
  if (claimFence !== currentFence) throw new TaskError("stale_execution");
}

export function leaseExpiry(now: Date) {
  return new Date(now.getTime() + SPEC_JOB_LEASE_SECONDS * MILLISECONDS_PER_SECOND);
}

export function stopNeedsAttention(requestedAt: Date | null, now: Date) {
  if (!requestedAt) return false;
  return now.getTime() - requestedAt.getTime() >= STOP_ATTENTION_AFTER_SECONDS * MILLISECONDS_PER_SECOND;
}
