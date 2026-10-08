import type { SoftwareDao } from "../../database/dao/softwareDao";
import { TaskFlowAdmission, type StartInput } from "./taskFlowAdmission";
import { TaskFlowRelocation, type MoveActionInput } from "./taskFlowRelocation";
import { assertPrerequisites, findPreparableAction } from "./admissionChecks";
import { TaskFlowOptions } from "./taskFlowOptions";
import { TaskFlowPlanService, type SavePlanInput } from "./taskFlowPlanService";
import type { TaskScope } from "./taskFlowPorts";
import { ISOLATED_ONLY } from "./taskFlowPorts";
import { TaskFlowPackageService, type ApprovePackageInput } from "./taskFlowPackageService";
import { TaskFlowReader, type RunsInput } from "./taskFlowReader";
import { TaskFlowRunControl, type CancelRunInput } from "./taskFlowRunControl";
import { RuntimeChoiceValidator } from "./runtimeChoiceValidator";
import { TaskFlowError } from "./taskFlowErrors";
import { actionWithRetryBindings, type RetryRuntimeBindings } from "./retryRuntimeBindings";
import { TaskFlowInteractionService, type AnswerRunQuestion } from "./taskFlowInteractionService";
import type { TaskFlowDependencies } from "./taskFlowDependencies";
import { LocalExecutionError } from "../local-execution/localExecutionErrors";

export type { TaskFlowDependencies } from "./taskFlowDependencies";

export class TaskFlowService {
  private readonly plans: TaskFlowPlanService;
  private readonly admission: TaskFlowAdmission;
  private readonly reader: TaskFlowReader;
  private readonly optionsReader: TaskFlowOptions;
  private readonly packageService: TaskFlowPackageService;
  private readonly runControl: TaskFlowRunControl;
  private readonly interactions: TaskFlowInteractionService | null;

  constructor(private readonly deps: TaskFlowDependencies) {
    const validator = new RuntimeChoiceValidator(deps.software.connections, deps.gateway);
    this.plans = new TaskFlowPlanService({ unit: deps.unit, validator, gate: deps.gate, loops: deps.loops, localProjects: deps.localProjects });
    this.admission = new TaskFlowAdmission({ validator, gateway: deps.gateway, readiness: deps.readiness, gate: deps.gate, workspaces: deps.workspaces ?? ISOLATED_ONLY, loops: deps.loops, localProjects: deps.localProjects, capacity: { maxActiveActions: async () => (await deps.software.settings.read()).maxActiveActions } });
    this.reader = new TaskFlowReader(deps.flow, deps.software, deps.legacy);
    this.optionsReader = new TaskFlowOptions(deps);
    this.packageService = new TaskFlowPackageService(deps.unit);
    this.runControl = new TaskFlowRunControl({ unit: deps.unit, executor: deps.control?.executor, releaseGrant: deps.control?.releaseGrant, owner: deps.control?.owner ?? "taskflow-api", clock: deps.control?.clock ?? (() => new Date()), leaseMs: deps.control?.leaseMs ?? 60_000 });
    this.interactions = deps.interactions ? new TaskFlowInteractionService(deps.flow, deps.interactions.gateway, deps.interactions.socketPathFor, deps.interactions.local) : null;
  }

  options = (scope: TaskScope) => this.optionsReader.options(scope);
  byTask = (taskId: string) => this.reader.byTask(taskId);
  packageDocuments = (taskId: string, packageId: string) => this.reader.packageDocuments(taskId, packageId);
  approvePackage = (scope: TaskScope, input: ApprovePackageInput) => this.packageService.approve(scope, input);
  cancelRun = (scope: TaskScope, input: CancelRunInput) => this.runControl.cancel(scope, input);
  flowKind = (taskId: string) => this.deps.flow.flowKind(taskId);
  runs = (input: RunsInput) => this.reader.runs(input);
  questions = (taskId: string, runId: string) => this.interactions?.questions(taskId, runId) ?? Promise.resolve([]);
  answerQuestion = (scope: TaskScope, input: AnswerRunQuestion) => {
    if (!this.interactions) throw new TaskFlowError("service_unavailable");
    return this.interactions.answer(scope.taskId, input);
  };
  savePlan = (scope: TaskScope, input: SavePlanInput) => this.plans.save(scope, input);

  async prepareLocalAction(scope: TaskScope, input: { actionId: string; expectedRevision: number; requestKey: string; runtimeBindings?: RetryRuntimeBindings }) {
    if (!scope.sourceSnapshotId || !this.deps.localProjects) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "local_unavailable" });
    const eligibility = await this.deps.gate.eligibility(scope);
    if (!eligibility.canPlan) throw new TaskFlowError(eligibility.reason ?? "action_unavailable");
    const plan = await this.deps.flow.plans.find(scope.taskId);
    if (!plan) throw new TaskFlowError("action_unavailable");
    if (plan.revision !== input.expectedRevision) throw new TaskFlowError("plan_version_changed", { revision: plan.revision });
    const action = findPreparableAction(plan, input.actionId);
    if (action.workspace.kind !== "local") throw new TaskFlowError("action_unavailable");
    if (input.runtimeBindings && action.state === "planned") throw new TaskFlowError("invalid_input");
    await assertPrerequisites({ plan, action, taskId: scope.taskId, gate: this.deps.gate });
    return this.deps.localProjects.prepare({ ...scope, actionId: action.id, sourceSnapshotId: scope.sourceSnapshotId, action: actionWithRetryBindings(action, input.runtimeBindings), requestKey: input.requestKey });
  }

  localPreparationStatus = (actorId: string, projectId: string, preparationId: string) => this.deps.localProjects?.preparationStatus({ actorId, projectId, preparationId }) ?? Promise.resolve(null);

  async gates(input: { taskId: string; runId: string; cursor?: string; limit: number }) {
    let result;
    try { result = await this.deps.localEvidence?.gates(input); }
    catch (error) { if (error instanceof LocalExecutionError && error.reason === "invalid_cursor") throw new TaskFlowError("invalid_cursor"); throw error; }
    if (!result) throw new TaskFlowError("run_unavailable");
    return result;
  }

  async evidence(input: { taskId: string; runId: string; evidenceId: string }) {
    const result = await this.deps.localEvidence?.evidence(input);
    if (!result) throw new TaskFlowError("evidence_unavailable");
    return result;
  }

  startAction = (scope: TaskScope, input: StartInput) => this.admit(scope, input, "start");
  retryAction = (scope: TaskScope, input: StartInput) => this.admit(scope, input, "retry");
  moveAction = (scope: TaskScope, input: MoveActionInput) => new TaskFlowRelocation(this.deps).move(scope, input);

  private async admit(scope: TaskScope, input: StartInput, mode: "start" | "retry") {
    const eligibility = await this.deps.gate.eligibility(scope);
    if (!eligibility.canPlan) throw new TaskFlowError(eligibility.reason ?? "flow_not_eligible");
    return this.deps.unit.run(({ flow, software }) => this.admissionWith(software).start(flow, scope, input, mode));
  }

  private admissionWith(software: SoftwareDao) {
    const validator = new RuntimeChoiceValidator(software.connections, this.deps.gateway);
    return new TaskFlowAdmission({ validator, gateway: this.deps.gateway, readiness: this.deps.readiness, gate: this.deps.gate, workspaces: this.deps.workspaces ?? ISOLATED_ONLY, loops: this.deps.loops, localProjects: this.deps.localProjects, capacity: { maxActiveActions: async () => (await software.settings.read()).maxActiveActions } });
  }
}
