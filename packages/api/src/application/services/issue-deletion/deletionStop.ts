import type { DeletionFailureReason } from "./issueDeletionContracts";
import type { IssueDeletionDao } from "../../database/dao/issueDeletionDao";

export type RunCancelResult = { runId: string; state: string; terminalCode: string | null };

export interface RunCancelPort {
  cancelActiveRuns(taskId: string): Promise<RunCancelResult[]>;
}

export type StopOutcome = { workStopped: boolean; reason: DeletionFailureReason | null };

export interface DeletionStopCoordinator {
  stopTask(taskId: string, deletionOperationId: string): Promise<StopOutcome>;
}

export type DeletionStopDeps = { dao: IssueDeletionDao; runs?: RunCancelPort };

export const ACTIVE_RUN_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];

export function terminalStopState(state: string): boolean {
  return ["canceled", "failed", "succeeded", "blocked", "exhausted", "stalled", "completed"].includes(state);
}
