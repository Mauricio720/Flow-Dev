import type { ActionRecord, RunRecord, TaskFlowDao } from "../../database/dao/taskFlowDao";
import type { CompozyControlGateway } from "../../software/compozyControlGateway";
import { assertPrerequisites, findStartableAction, type StartMode } from "./admissionChecks";
import { buildSnapshot } from "./admissionSnapshot";
import { bindingChoices } from "./planProposal";
import { actionWithRetryBindings, sameRetryBindings, type RetryRuntimeBindings } from "./retryRuntimeBindings";
import { assertReadyForStart } from "./readinessGate";
import { RuntimeChoiceValidator, type ValidatedChoice } from "./runtimeChoiceValidator";
import type { ActionSnapshot, FlowAction } from "./flowContracts";
import { TaskFlowError } from "./taskFlowErrors";
import type { FreshReadiness, LoopAdmission, TaskFlowGate, TaskScope, WorkspaceAdmission } from "./taskFlowPorts";
import type { LocalProjectAccess } from "./localProjectAccess";

export type StartInput = { actionId: string; expectedRevision: number; idempotencyKey: string; preparationId?: string; runtimeBindings?: RetryRuntimeBindings };
export type StartResult = { runId: string; actionId: string; state: string; replayed: boolean };

export type AdmissionDependencies = {
  validator: RuntimeChoiceValidator;
  gateway: CompozyControlGateway;
  readiness: FreshReadiness;
  gate: TaskFlowGate;
  workspaces: WorkspaceAdmission;
  loops?: LoopAdmission;
  localProjects?: LocalProjectAccess;
  capacity?: { maxActiveActions(): Promise<number> };
};

export class TaskFlowAdmission {
  constructor(private readonly deps: AdmissionDependencies) {}

  async start(dao: TaskFlowDao, scope: TaskScope, input: StartInput, mode: StartMode = "start"): Promise<StartResult> {
    await dao.lockTask(scope.taskId);
    await dao.assertWorkScope?.(scope);
    const replay = await dao.runs.findByKey(scope.taskId, input.idempotencyKey);
    if (replay) return this.replayed(replay, input);
    const plan = await dao.plans.lock(scope.taskId);
    if (!plan) throw new TaskFlowError("action_unavailable");
    if (plan.revision !== input.expectedRevision) throw new TaskFlowError("plan_version_changed", { revision: plan.revision });
    const action = findStartableAction(plan, input.actionId, mode);
    await assertPrerequisites({ plan, action, taskId: scope.taskId, gate: this.deps.gate });
    if (await dao.runs.activeWrite(scope.taskId)) throw new TaskFlowError("action_active");
    if (this.deps.capacity) {
      await dao.runs.lockAdmission();
      if (await dao.runs.countActiveTotal() >= await this.deps.capacity.maxActiveActions()) throw new TaskFlowError("capacity_reached");
    }
    const run = await this.admit(dao, scope, action, input, mode);
    await dao.plans.setActionState(action.id, "queued");
    await dao.plans.setStatus(plan.id, "running");
    return { runId: run.id, actionId: action.id, state: run.state, replayed: false };
  }

  private replayed(run: RunRecord, input: StartInput): StartResult {
    if (run.actionId !== input.actionId) throw new TaskFlowError("idempotency_key_reused");
    if (input.runtimeBindings && !sameRetryBindings(run.snapshot as ActionSnapshot, input.runtimeBindings)) throw new TaskFlowError("idempotency_key_reused");
    return { runId: run.id, actionId: run.actionId, state: run.state, replayed: true };
  }

  private async admit(dao: TaskFlowDao, scope: TaskScope, action: ActionRecord, input: StartInput, mode: StartMode) {
    assertReadyForStart(await this.deps.readiness.fresh(), action.workspace.kind === "local" ? "machine" : "host");
    if (mode !== "retry" && input.runtimeBindings) throw new TaskFlowError("invalid_input");
    const flowAction = actionWithRetryBindings(action, input.runtimeBindings);
    const validated = await this.validateBindings(flowAction);
    const release = [...validated.values()][0]?.release ?? "";
    if (flowAction.kind === "loop") await this.admitLoop(scope.taskId, flowAction);
    const { worktreeId, localTarget } = await this.deps.workspaces.resolve({ taskId: scope.taskId, projectId: scope.projectId, actorId: scope.actorId, workspace: action.workspace });
    if (action.workspace.kind === "local" && localTarget) assertLocalProviderOwnership(validated, localTarget.machineId, scope.actorId);
    let localPreparation: { preparationId: string; manifestHash: string; checkoutDigest: string; requiredGates: import("./localProjectAccess").LocalRequiredGate[] } | undefined;
    if (action.workspace.kind === "local") {
      if (!input.preparationId) throw new TaskFlowError("preparation_required");
      if (!scope.sourceSnapshotId || !this.deps.localProjects) throw new TaskFlowError("preparation_changed");
      const prepared = await this.deps.localProjects.validatePreparation({ taskId: scope.taskId, projectId: scope.projectId, actorId: scope.actorId, actionId: action.id, sourceSnapshotId: scope.sourceSnapshotId, preparationId: input.preparationId, action: flowAction });
      if (!prepared) throw new TaskFlowError("preparation_changed");
      localPreparation = { preparationId: input.preparationId, ...prepared };
    }
    const snapshot = buildSnapshot({ action: flowAction, validated, compozyVersion: release, worktreeId, localTarget, localPreparation, source: { snapshotId: scope.sourceSnapshotId ?? null, operatorId: scope.actorId } });
    return dao.runs.insert({ actionId: action.id, taskId: scope.taskId, snapshot, worktreeId, connectionIds: [...validated.values()].map((item) => item.connection.id), isWrite: true, idempotencyKey: input.idempotencyKey, requestedBy: scope.actorId });
  }

  private async admitLoop(taskId: string, action: Extract<FlowAction, { kind: "loop" }>) {
    if (!this.deps.loops) throw new TaskFlowError("loop_unavailable");
    await this.deps.loops.admit({ taskId, action });
  }

  private async validateBindings(action: FlowAction) {
    const validated = new Map<string, ValidatedChoice>();
    for (const [role, choice] of bindingChoices(action)) validated.set(role, await this.deps.validator.validate(choice, { lock: true }));
    return validated;
  }
}

export function assertLocalProviderOwnership(validated: Map<string, ValidatedChoice>, machineId: string, actorId: string) {
  for (const { connection } of validated.values()) {
    if (connection.executionTarget !== "machine" || connection.machineId !== machineId || connection.ownerUserId !== actorId) throw new TaskFlowError("connection_unavailable");
  }
}
