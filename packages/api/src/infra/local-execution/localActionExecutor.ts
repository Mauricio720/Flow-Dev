import { reportedActivity, terminalFailure } from "./localFailureReport";
import type { LocalConnectorDao } from "../../application/database/dao/localConnectorDao";
import type { RunRecord, TaskFlowDao } from "../../application/database/dao/taskFlowDao";
import type { ActionExecutor, ExecutionRequest, ExecutionResult, ReconcileResult } from "../../application/services/task-flow/actionExecutor";
import type { ActionSnapshot } from "../../application/services/task-flow/flowContracts";
import { localPayloadHash } from "../../application/services/local-execution/localHash";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import { settleReportedGates } from "./reportedGateSettlement";
import { approvedLoopFiles, approvedSpecFiles } from "../../application/services/local-execution/loopTaskFiles";
import { deterministicLocalRequestKey } from "./requestKey";

const COMMAND_LEASE_MS = 60_000;
const LOOP_KIND = "loop";
const TASKS_KIND = "create_tasks";

export class LocalActionExecutor implements ActionExecutor {
  constructor(private readonly deps: { local: LocalConnectorDao; flow: Pick<TaskFlowDao, "taskContext"> & Partial<Pick<TaskFlowDao, "packages">>; fallback: Partial<ActionExecutor>; now?: () => Date }) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const snapshot = request.snapshot;
    if (snapshot.workspace.kind !== "local") return this.deps.fallback.execute ? await this.deps.fallback.execute(request) : { kind: "blocked", code: "runtime_unavailable" };
    const target = snapshot.workspace.target;
    const prep = snapshot.localPreparation;
    if (!target || !prep || !snapshot.operatorId || !snapshot.sourceSnapshotId) return { kind: "blocked", code: "preparation_changed" } as const;
    const context = await this.deps.flow.taskContext(request.run.taskId);
    if (!context || context.projectId === "" || !context.source) return { kind: "blocked", code: "task_unavailable" } as const;
    const taskFiles = await this.taskFiles(snapshot.kind, request.run.taskId);
    if (taskFiles === null) return { kind: "blocked", code: "artifact_conflict" } as const;
    const payload = { preparationId: prep.preparationId, actionId: request.run.actionId, taskId: request.run.taskId, snapshot: snapshot as unknown as Record<string, unknown>, task: context.source, ...(taskFiles ? { taskFiles } : {}) };
    const now = (this.deps.now ?? (() => new Date()))();
    const commandId = deterministicLocalRequestKey(request.run.id, "start");
    try {
      const command = await this.deps.local.enqueueCommand({
        id: commandId,
        machineId: target.machineId, linkId: target.linkId, projectId: context.projectId, actorId: snapshot.operatorId,
        runId: request.run.id, preparationId: null, protocolVersion: 1, target, requestKey: commandId,
        kind: "start", payload, payloadHash: localPayloadHash(payload), fence: request.run.leaseFence,
        leaseExpiresAt: new Date(now.getTime() + COMMAND_LEASE_MS), expectedLinkRevision: target.linkRevision, now,
      });
      return { kind: "submitted", runtime: { workspaceId: `local:${target.machineId}`, sessionId: command.id, runId: request.run.id, turnId: null } } as const;
    } catch (error) {
      if (error instanceof LocalExecutionError && error.reason === "checkout_busy") return { kind: "blocked", code: "checkout_busy" } as const;
      if (error instanceof LocalExecutionError && error.reason === "outcome_unknown") return { kind: "unknown", runtime: { workspaceId: `local:${target.machineId}`, sessionId: commandId, runId: request.run.id, turnId: null } } as const;
      throw error;
    }
  }

  private async taskFiles(kind: string, taskId: string) {
    const packages = this.deps.flow.packages;
    if (kind === LOOP_KIND) return packages ? approvedLoopFiles(packages, taskId) : null;
    return kind === TASKS_KIND && packages ? approvedSpecFiles(packages, taskId) : undefined;
  }

  async reconcile(request: ExecutionRequest): Promise<ReconcileResult> {
    const snapshot = request.snapshot;
    if (snapshot.workspace.kind !== "local") return this.deps.fallback.reconcile?.(request) ?? { state: "unknown", code: "runtime_unavailable" };
    const context = await this.deps.flow.taskContext(request.run.taskId);
    const commandId = request.run.runtime.sessionId;
    if (!context?.projectId || !snapshot.operatorId || !commandId) return { state: "unknown", code: "command_unavailable" };
    const record = await this.deps.local.commandForActor({ actorId: snapshot.operatorId, projectId: context.projectId, commandId });
    if (!record) return { state: "unknown", code: "command_unavailable" };
    if (record.command.runId !== request.run.id || record.command.kind !== "start") return { state: "unknown", code: "command_unavailable" };
    if (record.command.fence > request.run.leaseFence) return { state: "unknown", code: "stale_fence" };
    const terminal = [...record.events].reverse().find((event) => event.kind === "terminal");
    const activityEvent = [...record.events].reverse().find((event) => event.kind === "activity");
    const activity = activityEvent ? reportedActivity(activityEvent) : null;
    if (!terminal) {
      if (record.command.state === "expired") return { state: "blocked", code: "command_expired", ...(activity ? { activity, runtimeEventSequence: activity.sequence } : {}) };
      return { state: "running", code: null, ...(activity ? { activity, runtimeEventSequence: activity.sequence } : {}) };
    }
    const result = terminal.payload;
    const terminalResult = result.outcome;
    if (terminalResult === "canceled") return { state: "canceled", code: typeof result.reason === "string" ? result.reason : "user_canceled", ...(activity ? { activity } : {}) };
    const failed = terminalFailure(terminal, activity);
    if (failed) return failed;
    if (result.runtimeSucceeded !== true || result.artifactsSafe !== true || typeof result.checkoutDigest !== "string" || !snapshot.localPreparation) return { state: "blocked", code: "evidence_rejected", ...(activity ? { activity } : {}) };
    const settled = settleReportedGates({ runId: request.run.id, actionKind: snapshot.kind, preparation: snapshot.localPreparation, events: record.events, finalCheckoutDigest: result.checkoutDigest });
    return { ...settled, ...(activity ? { activity } : {}) };
  }

  async cancel(request: ExecutionRequest): Promise<ReconcileResult> {
    const snapshot = request.snapshot;
    if (snapshot.workspace.kind !== "local") return this.deps.fallback.cancel ? this.deps.fallback.cancel(request) : { state: "unknown", code: "runtime_unavailable" };
    const target = snapshot.workspace.target;
    if (!target || !snapshot.operatorId) return { state: "unknown", code: "command_unavailable" };
    const context = await this.deps.flow.taskContext(request.run.taskId);
    if (!context) return { state: "unknown", code: "task_unavailable" };
    const payload = { requestKey: deterministicLocalRequestKey(request.run.id, "cancel") };
    const now = (this.deps.now ?? (() => new Date()))();
    await this.deps.local.enqueueCommand({ machineId: target.machineId, linkId: target.linkId, projectId: context.projectId, actorId: snapshot.operatorId, runId: request.run.id, preparationId: null, protocolVersion: 1, target, requestKey: deterministicLocalRequestKey(request.run.id, "cancel"), kind: "cancel", payload, payloadHash: localPayloadHash(payload), fence: request.run.leaseFence, leaseExpiresAt: new Date(now.getTime() + COMMAND_LEASE_MS), expectedLinkRevision: target.linkRevision, now });
    return { state: "running", code: null };
  }
}
