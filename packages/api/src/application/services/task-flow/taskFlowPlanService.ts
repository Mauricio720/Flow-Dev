import { createHash } from "node:crypto";
import type { FlowUnitOfWork } from "../../database/dao/flowUnitOfWork";
import type { TaskFlowDao } from "../../database/dao/taskFlowDao";
import { bindingChoices, toPlannedAction } from "./planProposal";
import { assertStartedActionsUnchanged, startedActions } from "./planLocks";
import { assertPlanShape } from "./planShape";
import { bindLocalTargets } from "./localTargetBinding";
import type { LocalProjectAccess } from "./localProjectAccess";
import type { FlowAction } from "./flowContracts";
import { stableJson } from "./stableJson";
import { RuntimeChoiceValidator } from "./runtimeChoiceValidator";
import { TaskFlowError } from "./taskFlowErrors";
import type { LoopAdmission, TaskFlowGate, TaskScope } from "./taskFlowPorts";

export type SavePlanInput = { actions: FlowAction[]; expectedRevision: number; idempotencyKey: string };
export type SavePlanResult = { revision: number; state: "planned"; runId: null };

export type PlanDependencies = { unit: FlowUnitOfWork; validator: RuntimeChoiceValidator; gate: TaskFlowGate; loops?: LoopAdmission; localProjects?: LocalProjectAccess };

const hashOf = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");

export class TaskFlowPlanService {
  constructor(private readonly deps: PlanDependencies) {}

  async save(scope: TaskScope, input: SavePlanInput): Promise<SavePlanResult> {
    assertPlanShape(input.actions);
    const eligibility = await this.deps.gate.eligibility(scope);
    if (!eligibility.canPlan) throw new TaskFlowError(eligibility.reason ?? "flow_not_eligible");
    await this.validateRuntime(scope, input.actions);
    const bound = await bindLocalTargets(input.actions, scope, this.deps.localProjects);
    return this.deps.unit.run(({ flow }) => this.saveLocked(flow, scope, { ...input, bound }));
  }

  private async validateRuntime(scope: TaskScope, actions: FlowAction[]) {
    for (const action of actions) {
      if (action.kind === "loop") await this.admitLoop(scope.taskId, action);
      for (const [, choice] of bindingChoices(action)) await this.deps.validator.validate(choice, { lock: false });
    }
  }

  private async admitLoop(taskId: string, action: Extract<FlowAction, { kind: "loop" }>) {
    if (!this.deps.loops) throw new TaskFlowError("loop_unavailable");
    await this.deps.loops.admit({ taskId, action });
  }

  private async saveLocked(dao: TaskFlowDao, scope: TaskScope, input: SavePlanInput & { bound: FlowAction[] }): Promise<SavePlanResult> {
    await dao.lockTask(scope.taskId);
    await dao.assertWorkScope?.(scope);
    if ((await dao.flowKind(scope.taskId)) === "legacy") throw new TaskFlowError("legacy_flow_active");
    const requestHash = hashOf({ actions: input.actions, expectedRevision: input.expectedRevision });
    const receipt = await dao.plans.findSave(scope.taskId, input.idempotencyKey);
    if (receipt) return this.replay(receipt, requestHash);
    const plan = await dao.plans.lock(scope.taskId);
    const current = plan?.revision ?? 0;
    if (current !== input.expectedRevision) throw new TaskFlowError("plan_version_changed", { revision: current });
    assertStartedActionsUnchanged(plan?.actions ?? [], input.actions);
    const revision = current + 1;
    const stored = plan ?? await dao.plans.insert({ taskId: scope.taskId, actorId: scope.actorId, revision });
    const kept = startedActions(stored.actions).length;
    const planned = input.bound.slice(kept).map((action, index) => toPlannedAction(action, kept + index + 1));
    await dao.plans.replacePlanned({ planId: stored.id, revision, actions: planned });
    await dao.plans.recordSave({ taskId: scope.taskId, idempotencyKey: input.idempotencyKey, requestHash, resultRevision: revision });
    return { revision, state: "planned", runId: null };
  }

  private replay(receipt: { requestHash: string; resultRevision: number }, requestHash: string): SavePlanResult {
    if (receipt.requestHash !== requestHash) throw new TaskFlowError("idempotency_key_reused");
    return { revision: receipt.resultRevision, state: "planned", runId: null };
  }
}
