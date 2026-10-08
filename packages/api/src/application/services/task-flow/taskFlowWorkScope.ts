import type { TaskScope } from "./taskFlowPorts";
import { TaskFlowError } from "./taskFlowErrors";

export type CurrentWorkScope = { operatorUserId: string | null; claimState: string | null; claimRevision: number | null; sourceSnapshotId: string | null };

export function assertCurrentWorkScope(scope: TaskScope, current: CurrentWorkScope | undefined) {
  if (!current) throw new TaskFlowError("task_unavailable");
  if (current.claimState === "pending" || current.claimState === "uncertain") throw new TaskFlowError("claim_unresolved");
  if (current.claimState !== "claimed" || current.operatorUserId !== scope.actorId) throw new TaskFlowError("operator_required");
  if (current.claimRevision !== scope.claimRevision || current.sourceSnapshotId !== scope.sourceSnapshotId) throw new TaskFlowError("source_changed");
}
