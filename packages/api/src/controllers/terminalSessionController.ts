import type { ProjectRecord } from "../application/database/dao/projectDao";
import type { ApprovedPlanning, TerminalSessionDao } from "../application/database/dao/terminalSessionDao";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import type { VerifiedCheckout } from "../application/services/projects/localCheckoutService";
import { repositoryOf } from "../application/services/projects/localCheckoutService";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { IssueImageSelector } from "../application/services/terminal/issueImageSelector";
import type { AttachmentPlan } from "../application/services/terminal/sessionAttachmentDelivery";
import type { TerminalAttachmentService } from "../application/services/terminal/terminalAttachmentService";
import type { TerminalOpenGuard } from "../application/services/terminal/terminalOpenGuard";
import { SessionPrepareStep, openedResult, promptSource, type PrepareStepDeps } from "../application/services/terminal/terminalOpenSteps";
import { MAX_PROMPT_LENGTH, buildDefaultPrompt } from "../application/services/terminal/terminalPromptBuilder";
import type { PermissionMode } from "../application/terminal/sessionInteraction";
import type { SessionPrincipal } from "../context";

type Scope = { projectId: string; taskId: string };
type OpenInput = Scope & { prompt: string; requestKey: string; attachmentIds: string[]; issueImageIds: string[]; allowAdditional: boolean; permissionMode: PermissionMode };
type OpenRequest = { actor: SessionPrincipal; input: OpenInput; planning: ApprovedPlanning; checkout: VerifiedCheckout; plan: AttachmentPlan };

export type TerminalControllerDeps = PrepareStepDeps & {
  authorization: Pick<WorkAuthorization, "requireOperate">;
  sessions: TerminalSessionDao;
  projects: { findById(projectId: string): Promise<ProjectRecord | null> };
  guard: TerminalOpenGuard;
  issueImages: Pick<IssueImageSelector, "select">;
  cleanup: Pick<TerminalAttachmentService, "cleanup">;
  hostId: string;
};

export class TerminalSessionController {
  private readonly prepareStep: SessionPrepareStep;
  constructor(private readonly deps: TerminalControllerDeps) {
    this.prepareStep = new SessionPrepareStep(deps);
  }

  async preflight(actor: SessionPrincipal, scope: Scope) {
    await this.requireOperator(actor, scope);
    await this.cleanupFiles();
    const planning = await this.requireApproved(scope.taskId);
    const repository = await this.repositoryOf(scope.projectId);
    const found = await this.deps.guard.readCheckout({ userId: actor.userId, projectId: scope.projectId, repository });
    const checkout = found && { path: found.path, branch: found.branch, detachedSha: found.detachedSha, dirty: found.dirty };
    const issueImages = await this.deps.issueImages.select(scope.taskId, planning.issue.body);
    const sessionService = { running: await this.deps.guard.serviceRunning() };
    return { checkout, defaultPrompt: buildDefaultPrompt(promptSource(planning)), maxPromptLength: MAX_PROMPT_LENGTH, issueImages, sessionService };
  }

  async open(actor: SessionPrincipal, input: OpenInput) {
    this.deps.guard.assertEnabled();
    await this.requireOperator(actor, input);
    await this.cleanupFiles();
    const planning = await this.requireApproved(input.taskId);
    const existing = await this.deps.sessions.findByRequestKey(actor.userId, input.requestKey);
    if (existing && !existing.launchFailedAt) return openedResult(existing);
    if (!input.allowAdditional && await this.deps.sessions.hasActiveSession(input.taskId, actor.userId)) throw new TaskError("session_already_active");
    this.deps.guard.assertPrompt(input.prompt);
    const repository = await this.repositoryOf(input.projectId);
    const checkout = await this.deps.guard.requireCheckout({ userId: actor.userId, projectId: input.projectId, repository });
    await this.deps.guard.assertTools();
    await this.deps.guard.assertServiceRunning();
    await this.deps.guard.assertSkills();
    const plan = await this.deps.delivery.plan({ userId: actor.userId, taskId: input.taskId, issueBody: planning.issue.body, attachmentIds: input.attachmentIds, issueImageIds: input.issueImageIds });
    return this.start({ actor, input, planning, checkout, plan });
  }

  private async start({ actor, input, planning, checkout, plan }: OpenRequest) {
    const base = { taskId: input.taskId, projectId: input.projectId, userId: actor.userId, planningDecisionId: planning.decisionId, route: planning.route, requestKey: input.requestKey };
    const flowDev = { runtime: "flow_dev" as const, permissionMode: input.permissionMode, hostId: this.deps.hostId };
    const created = await this.deps.sessions.create({ ...base, ...flowDev, checkoutPath: checkout.path, branch: checkout.branch, dirty: checkout.dirty }, this.deps.delivery.links(plan));
    if (!created.created) return openedResult(created.session);
    await this.prepareStep.run(created.session, input.prompt, plan);
    this.deps.log.opened({ sessionId: created.session.id, taskId: input.taskId, route: planning.route });
    return openedResult(created.session, plan.unavailableIssueImages);
  }

  private async cleanupFiles() {
    await this.deps.cleanup.cleanup(new Date()).catch(() => undefined);
  }

  private requireOperator(actor: SessionPrincipal, scope: Scope) {
    return this.deps.authorization.requireOperate({ projectId: scope.projectId, taskId: scope.taskId, actorId: actor.userId });
  }

  private async requireApproved(taskId: string) {
    const planning = await this.deps.sessions.approvedPlanning(taskId);
    if (!planning) throw new TaskError("planning_not_approved");
    return planning;
  }

  private async repositoryOf(projectId: string) {
    const project = await this.deps.projects.findById(projectId);
    if (!project) throw new TaskError("project_unavailable");
    return repositoryOf(project);
  }
}
