import { AssignedIssueError } from "../application/services/assigned-issues/assignedIssueErrors";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { TaskFlowError } from "../application/services/task-flow/taskFlowErrors";
import type { TaskScope } from "../application/services/task-flow/taskFlowPorts";
import type { TaskFlowService } from "../application/services/task-flow/taskFlowService";
import type { SessionPrincipal } from "../context";
import { TASK_FLOW_DEFAULT_PAGE_SIZE } from "../schemas/taskFlow";
import { mapLocalExecutionError } from "./localExecutionErrorMapper";
import { LocalExecutionError } from "../application/services/local-execution/localExecutionErrors";

type Scope = { projectId: string; taskId: string };

export class TaskFlowController {
  constructor(private readonly authorization: WorkAuthorization, private readonly service: TaskFlowService) {}

  async options(actor: SessionPrincipal, input: Scope) {
    const scope = await this.requireRead(actor, input);
    const assessment = await this.authorization.assess({ ...input, actorId: actor.userId }, false);
    const reason = assessment.reason ?? (assessment.contentHash !== null && assessment.contentHash !== assessment.source.snapshot.contentHash ? "source_changed" : null);
    if (!reason) return { ...(await this.service.options(scope)), viewerCanOperate: true, reason: null };
    const flow = await this.service.flowKind(input.taskId);
    return { taskId: input.taskId, flow, planningAvailable: false, planningReason: reason, startReason: reason, localStartReason: reason, actions: [], connections: [], workspaces: [], loops: [], loopsReason: null, worktrees: [], managedWorktreesAvailable: false, viewerCanOperate: false, reason };
  }

  async byTask(actor: SessionPrincipal, input: Scope) {
    await this.requireRead(actor, input);
    return this.service.byTask(input.taskId);
  }

  async runs(actor: SessionPrincipal, input: Scope & { cursor?: string; limit?: number }) {
    await this.requireRead(actor, input);
    return this.service.runs({ taskId: input.taskId, cursor: input.cursor, limit: input.limit ?? TASK_FLOW_DEFAULT_PAGE_SIZE });
  }

  async packageDocuments(actor: SessionPrincipal, input: Scope & { packageId: string }) {
    await this.requireRead(actor, input);
    return this.service.packageDocuments(input.taskId, input.packageId);
  }

  async questions(actor: SessionPrincipal, input: Scope & { runId: string }) {
    await this.requireRead(actor, input);
    return this.service.questions(input.taskId, input.runId);
  }

  async answerQuestion(actor: SessionPrincipal, input: Scope & Parameters<TaskFlowService["answerQuestion"]>[1]) {
    const { projectId, taskId, ...answer } = input;
    return this.service.answerQuestion(await this.requireOperator(actor, { projectId, taskId }), answer);
  }

  async approvePackage(actor: SessionPrincipal, input: Scope & Parameters<TaskFlowService["approvePackage"]>[1]) {
    const { projectId, taskId, ...approval } = input;
    return this.service.approvePackage(await this.requireOperator(actor, { projectId, taskId }), approval);
  }

  async cancelRun(actor: SessionPrincipal, input: Scope & Parameters<TaskFlowService["cancelRun"]>[1]) {
    const { projectId, taskId, ...cancel } = input;
    return this.service.cancelRun(await this.requireOperator(actor, { projectId, taskId }), cancel);
  }

  async retryAction(actor: SessionPrincipal, input: Scope & Parameters<TaskFlowService["retryAction"]>[1]) {
    const { projectId, taskId, ...retry } = input;
    try { return await this.service.retryAction(await this.requireOperator(actor, { projectId, taskId }), retry); }
    catch (error) { if (error instanceof LocalExecutionError) mapLocalExecutionError(error); throw error; }
  }

  async moveAction(actor: SessionPrincipal, input: Scope & Parameters<TaskFlowService["moveAction"]>[1]) {
    const { projectId, taskId, ...move } = input;
    return this.service.moveAction(await this.requireOperator(actor, { projectId, taskId }), move);
  }

  async savePlan(actor: SessionPrincipal, input: Scope & Parameters<TaskFlowService["savePlan"]>[1]) {
    const { projectId, taskId, ...plan } = input;
    return this.service.savePlan(await this.requireOperator(actor, { projectId, taskId }), plan);
  }

  async startAction(actor: SessionPrincipal, input: Scope & Parameters<TaskFlowService["startAction"]>[1]) {
    const { projectId, taskId, ...start } = input;
    try { return await this.service.startAction(await this.requireOperator(actor, { projectId, taskId }), start); }
    catch (error) { if (error instanceof LocalExecutionError) mapLocalExecutionError(error); throw error; }
  }

  async prepareLocalAction(actor: SessionPrincipal, input: Scope & Parameters<TaskFlowService["prepareLocalAction"]>[1]) {
    const { projectId, taskId, ...prepare } = input;
    try { return await this.service.prepareLocalAction(await this.requireOperator(actor, { projectId, taskId }), prepare); }
    catch (error) { if (error instanceof LocalExecutionError) mapLocalExecutionError(error); throw error; }
  }

  async localPreparationStatus(actor: SessionPrincipal, input: Scope & { preparationId: string }) {
    await this.requireRead(actor, input);
    return this.service.localPreparationStatus(actor.userId, input.projectId, input.preparationId);
  }

  async gates(actor: SessionPrincipal, input: Scope & { runId: string; cursor?: string; limit: number }) {
    await this.requireRead(actor, input);
    return this.service.gates({ taskId: input.taskId, runId: input.runId, cursor: input.cursor, limit: input.limit });
  }

  async evidence(actor: SessionPrincipal, input: Scope & { runId: string; evidenceId: string }) {
    await this.requireRead(actor, input);
    return this.service.evidence({ taskId: input.taskId, runId: input.runId, evidenceId: input.evidenceId });
  }

  private async requireRead(actor: SessionPrincipal, scope: Scope): Promise<TaskScope> {
    await this.translate(() => this.authorization.requireRead({ ...scope, actorId: actor.userId }));
    return { ...scope, actorId: actor.userId };
  }

  private async requireOperator(actor: SessionPrincipal, scope: Scope): Promise<TaskScope> {
    const work = await this.translate(() => this.authorization.requireOperate({ ...scope, actorId: actor.userId }, { currentSource: true }));
    return { ...work };
  }

  private async translate<T>(operation: () => Promise<T>) {
    try { return await operation(); }
    catch (error) {
      if (error instanceof AssignedIssueError && error.reason === "work_unavailable") throw new TaskFlowError("task_unavailable");
      if (error instanceof AssignedIssueError && error.reason === "operator_required") throw new TaskFlowError("operator_required");
      throw error;
    }
  }
}
