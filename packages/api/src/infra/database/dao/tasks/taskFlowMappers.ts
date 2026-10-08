import type { ActionRecord, FlowWorkspace, PlanRecord, RunRecord, RuntimeBindingRecord } from "../../../../application/database/dao/taskFlowDao";
import type { taskExecutionActions, taskExecutionPlans, taskExecutionRuns, taskExecutionRuntimeBindings } from "../../schema";

type PlanRow = typeof taskExecutionPlans.$inferSelect;
type ActionRow = typeof taskExecutionActions.$inferSelect;
type BindingRow = typeof taskExecutionRuntimeBindings.$inferSelect;
type RunRow = typeof taskExecutionRuns.$inferSelect;

export function toWorkspace(row: ActionRow): FlowWorkspace {
  if (row.workspaceKind === "existing") return { kind: "existing", worktreeId: row.worktreeId! };
  if (row.workspaceKind === "new") return { kind: "new", name: row.worktreeName! };
  if (row.workspaceKind === "local") return { kind: "local", target: { machineId: row.localMachineId!, linkId: row.localLinkId!, linkRevision: row.localLinkRevision!, checkoutHandle: row.localCheckoutHandle! } };
  return { kind: "isolated" };
}

function toBinding(row: BindingRow): RuntimeBindingRecord {
  const { role, connectionId, providerId, modelId, reasoningEffort } = row;
  return { role, connectionId, providerId, modelId, reasoningEffort };
}

export function toAction(row: ActionRow, bindings: BindingRow[]): ActionRecord {
  return {
    id: row.id,
    position: row.position,
    kind: row.kind as ActionRecord["kind"],
    loopName: row.loopName,
    loopVersion: row.loopVersion,
    inputs: row.inputs,
    workspace: toWorkspace(row),
    state: row.state,
    bindings: bindings.filter((binding) => binding.actionId === row.id).map(toBinding),
  };
}

export function toPlan(row: PlanRow, actions: ActionRecord[]): PlanRecord {
  const { id, taskId, revision, createdBy, updatedAt } = row;
  return { id, taskId, kind: "os_unified", revision, status: row.status as PlanRecord["status"], createdBy, updatedAt, actions };
}

export function toRun(row: RunRow): RunRecord {
  const { id, actionId, taskId, attemptNumber, state, snapshot, worktreeId, connectionIds, isWrite, leaseFence, idempotencyKey, terminalCode, leaseOwner, requestedBy, createdAt, finishedAt } = row;
  const runtime = { workspaceId: row.runtimeWorkspaceId, sessionId: row.runtimeSessionId, turnId: row.runtimeTurnId, runId: row.runtimeRunId };
  return { id, actionId, taskId, attemptNumber, state, snapshot, worktreeId, connectionIds, isWrite, leaseFence, idempotencyKey, terminalCode, runtime, runtimeEventSequence: row.runtimeEventSequence, activity: row.activity, leaseOwner, requestedBy, createdAt, finishedAt };
}
