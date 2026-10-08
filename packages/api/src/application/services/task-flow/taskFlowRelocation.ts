import type { FlowTransaction, FlowUnitOfWork } from "../../database/dao/flowUnitOfWork";
import type { CompozyControlGateway } from "../../software/compozyControlGateway";
import { findStartableAction } from "./admissionChecks";
import type { FlowAction, WorkspaceChoice } from "./flowContracts";
import type { LocalProjectAccess } from "./localProjectAccess";
import { bindingChoices, toPlannedAction } from "./planProposal";
import { actionWithRetryBindings, type RetryRuntimeBindings } from "./retryRuntimeBindings";
import { RuntimeChoiceValidator, type ValidatedChoice } from "./runtimeChoiceValidator";
import { assertLocalProviderOwnership } from "./taskFlowAdmission";
import { TaskFlowError } from "./taskFlowErrors";
import type { LoopAdmission, TaskFlowGate, TaskScope } from "./taskFlowPorts";

export type MovableWorkspace = { kind: "isolated" } | { kind: "local" };
export type MoveActionInput = { actionId: string; expectedRevision: number; workspace: MovableWorkspace; runtimeBindings: RetryRuntimeBindings };
type BoundMove = Omit<MoveActionInput, "workspace"> & { workspace: WorkspaceChoice };
export type RelocationDependencies = { unit: FlowUnitOfWork; gateway: CompozyControlGateway; gate: TaskFlowGate; loops?: LoopAdmission; localProjects?: LocalProjectAccess };

const LOCAL_KIND = "local";
const HOST_TARGET = "host";
const MOVABLE_KINDS = ["isolated", LOCAL_KIND];
const LOCAL_UNAVAILABLE = "local_unavailable";

export class TaskFlowRelocation {
  constructor(private readonly deps: RelocationDependencies) {}

  async move(scope: TaskScope, input: MoveActionInput) {
    const eligibility = await this.deps.gate.eligibility(scope);
    if (!eligibility.canPlan) throw new TaskFlowError(eligibility.reason ?? "flow_not_eligible");
    const workspace = await this.bindTarget(scope, input.workspace);
    return this.deps.unit.run((transaction) => this.moveLocked(transaction, scope, { ...input, workspace }));
  }

  private async bindTarget(scope: TaskScope, workspace: MovableWorkspace): Promise<WorkspaceChoice> {
    if (workspace.kind !== LOCAL_KIND) return workspace;
    const project = await this.deps.localProjects?.resolveTarget(scope);
    if (!project) throw new TaskFlowError("worktree_not_ready", undefined, { cause: LOCAL_UNAVAILABLE });
    return { kind: LOCAL_KIND, target: project.target };
  }

  private async moveLocked({ flow, software }: FlowTransaction, scope: TaskScope, input: BoundMove) {
    await flow.lockTask(scope.taskId);
    await flow.assertWorkScope?.(scope);
    const plan = await flow.plans.lock(scope.taskId);
    if (!plan) throw new TaskFlowError("action_unavailable");
    if (plan.revision !== input.expectedRevision) throw new TaskFlowError("plan_version_changed", { revision: plan.revision });
    const action = findStartableAction(plan, input.actionId, "retry");
    if (!MOVABLE_KINDS.includes(action.workspace.kind) || action.workspace.kind === input.workspace.kind) throw new TaskFlowError("invalid_input");
    if (await flow.runs.activeWrite(scope.taskId)) throw new TaskFlowError("action_active");
    const moved: FlowAction = { ...actionWithRetryBindings(action, input.runtimeBindings), workspace: input.workspace };
    await this.assertRuntimes(new RuntimeChoiceValidator(software.connections, this.deps.gateway), scope, moved);
    if (moved.kind === "loop") await this.admitLoop(scope.taskId, moved);
    const revision = plan.revision + 1;
    await flow.plans.relocateAction({ planId: plan.id, actionId: action.id, revision, workspace: moved.workspace, bindings: toPlannedAction(moved, action.position).bindings });
    return { revision };
  }

  private async assertRuntimes(validator: RuntimeChoiceValidator, scope: TaskScope, action: FlowAction) {
    const validated = new Map<string, ValidatedChoice>();
    for (const [role, choice] of bindingChoices(action)) validated.set(role, await validator.validate(choice, { lock: false }));
    const target = action.workspace.kind === LOCAL_KIND ? action.workspace.target : undefined;
    if (target) return assertLocalProviderOwnership(validated, target.machineId, scope.actorId);
    const onHost = [...validated.values()].every(({ connection }) => (connection.executionTarget ?? HOST_TARGET) === HOST_TARGET);
    if (!onHost) throw new TaskFlowError("connection_unavailable");
  }

  private async admitLoop(taskId: string, action: Extract<FlowAction, { kind: "loop" }>) {
    if (!this.deps.loops) throw new TaskFlowError("loop_unavailable");
    await this.deps.loops.admit({ taskId, action });
  }
}
