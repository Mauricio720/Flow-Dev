import type { DeletionFailureReason, DeletionOperation, DeletionState, RemotePresence } from "./issueDeletionContracts";

export const PROCESSING_STATES: DeletionState[] = ["stopping", "reconciling", "deleting_remote", "verifying_remote", "cleaning_local"];
export const RECOVERABLE_STATES: DeletionState[] = ["recoverable"];

export type PublicationOutcome = "queued" | "dispatching" | "created" | "rejected" | "uncertain" | null;

export function classifyLocalOnly(attempts: { outcome: string | null }[]): boolean {
  return attempts.length === 0 || attempts.every((attempt) => attempt.outcome === "rejected");
}

export function isLinkedOperation(operation: Pick<DeletionOperation, "remotePresence" | "issueNodeId">): boolean {
  return operation.remotePresence !== "not_applicable";
}

export function canEnterCleanup(operation: Pick<DeletionOperation, "remotePresence">, workStopped: boolean): boolean {
  if (!workStopped) return false;
  return operation.remotePresence === "not_applicable" || operation.remotePresence === "absent";
}

export function cleanupAllowedFor(remotePresence: RemotePresence): boolean {
  return remotePresence === "not_applicable" || remotePresence === "absent";
}

export function requiredRemoteEvidence(destinations: ("flow_dev" | "github")[]): RemotePresence {
  return destinations.includes("github") ? "absent" : "not_applicable";
}

export function recoverableState(reason: DeletionFailureReason): DeletionState {
  return "recoverable";
}

export function retryAfterToSeconds(retryAt: Date | null, now: Date): number | null {
  if (!retryAt) return null;
  const seconds = Math.max(0, Math.ceil((retryAt.getTime() - now.getTime()) / 1000));
  return seconds;
}
