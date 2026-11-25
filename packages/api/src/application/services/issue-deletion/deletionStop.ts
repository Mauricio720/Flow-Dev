import type { DeletionFailureReason } from "./issueDeletionContracts";
import type { IssueDeletionDao } from "../../database/dao/issueDeletionDao";
import type { SessionLog } from "../terminal/sessionLog";

export type StopOutcome = { workStopped: boolean; reason: DeletionFailureReason | null };

export interface DeletionStopCoordinator {
  stopTask(taskId: string, deletionOperationId: string): Promise<StopOutcome>;
}

export type DeletionStopDeps = { dao: IssueDeletionDao; log: SessionLog };
