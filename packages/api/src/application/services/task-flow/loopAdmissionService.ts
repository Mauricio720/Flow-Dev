import type { CompozyControlGateway, LoopDefinition } from "../../software/compozyControlGateway";
import type { ControlWorkspaceResolver } from "./controlWorkspace";
import type { LoopFlowAction } from "./flowContracts";
import type { LocalProjectAccess } from "./localProjectAccess";
import { IMPLEMENT_LOOP, REVIEW_LOOP } from "./loopOrder";
import { LoopPlanValidator } from "./loopPlanValidator";
import { TaskFlowError, type TaskFlowReason } from "./taskFlowErrors";
import type { LoopAdmission } from "./taskFlowPorts";

export type LoopAdmissionDependencies = { gateway: CompozyControlGateway; resolver: ControlWorkspaceResolver; projectOf: (taskId: string) => Promise<string | null>; localProjects?: Pick<LocalProjectAccess, "inspect">; validator?: LoopPlanValidator };

const PASSTHROUGH_CODES: TaskFlowReason[] = ["loop_version_changed", "runtime_incompatible", "auth_required"];
const LOCAL_WORKSPACE = "local";
const TASK_TARGET_FIELDS: Record<string, string> = { [IMPLEMENT_LOOP]: "slug", [REVIEW_LOOP]: "task_name" };

type LoopTarget = { taskId: string; projectId: string; action: LoopFlowAction };

export class LoopAdmissionService implements LoopAdmission {
  private readonly validator: LoopPlanValidator;

  constructor(private readonly deps: LoopAdmissionDependencies) {
    this.validator = deps.validator ?? new LoopPlanValidator();
  }

  async admit(input: Parameters<LoopAdmission["admit"]>[0]) {
    const projectId = await this.deps.projectOf(input.taskId);
    if (!projectId) throw new TaskFlowError("loop_unavailable");
    const target = { ...input, projectId };
    const definition = input.action.workspace.kind === LOCAL_WORKSPACE ? await this.localDefinition(target) : await this.hostDefinition(target);
    const targetField = TASK_TARGET_FIELDS[input.action.loopName];
    if (targetField && definition.inputs.some((item) => item.name === targetField) && input.action.inputs[targetField] !== input.taskId) throw new TaskFlowError("loop_input_invalid");
    this.validator.validate(input.action, definition);
  }

  private async localDefinition(target: LoopTarget): Promise<LoopDefinition> {
    const project = await this.deps.localProjects?.inspect({ taskId: target.taskId, projectId: target.projectId });
    const definition = project?.loops?.find((loop) => loop.name === target.action.loopName);
    if (!definition) throw new TaskFlowError("loop_unavailable");
    return definition;
  }

  private async hostDefinition(target: LoopTarget): Promise<LoopDefinition> {
    const context = await this.deps.resolver.resolve({ taskId: target.taskId, projectId: target.projectId, workspace: target.action.workspace });
    if (!context) throw new TaskFlowError("loop_unavailable");
    const inspected = await this.deps.gateway.inspectLoop(context.workspaceId, target.action.loopName);
    if (!inspected.ok) throw new TaskFlowError(PASSTHROUGH_CODES.includes(inspected.code as TaskFlowReason) ? (inspected.code as TaskFlowReason) : "loop_unavailable");
    return inspected.value;
  }
}
