import type { ApprovedPlanning, CreateTerminalSessionInput, CreatedTerminalSession, TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import type { ProjectRecord } from "../../database/dao/projectDao";
import type { SessionPrincipal } from "../../../context";
import { DEFAULT_PERMISSION_MODE } from "../../terminal/sessionInteraction";
import type { AgentChoice } from "../../terminal/sessionAgentCatalog";
import type { SessionPurposeKind } from "../../terminal/sessionPurposeKind";
import type { SessionAttachmentDelivery, AttachmentPlan } from "./sessionAttachmentDelivery";
import { EMPTY_PLAN } from "./sessionAttachmentDelivery";
import { SessionPrepareStep, openedResult } from "./terminalOpenSteps";
import type { TerminalSessionDao } from "../../database/dao/terminalSessionDao";
import type { SessionContextBuilder } from "../../terminal/sessionContext";
import type { TerminalLog } from "./terminalLaunchLog";
import type { VerifiedCheckout } from "../projects/localCheckoutService";
import type { TerminalOpenGuard } from "./terminalOpenGuard";
import { repositoryOf } from "../projects/localCheckoutService";
import { TaskError } from "../tasks/taskErrors";
import type { ResolvedPurpose } from "../../terminal/sessionPurposeInput";
import type { PermissionMode } from "../../terminal/sessionInteraction";
import type { SessionFolderService } from "../worktrees/sessionFolderService";

export type ReviewPurpose = Extract<SessionPurposeKind, "review" | "review_execute">;
export type LaunchInput = { actorId: string; taskId: string; projectId: string; requestKey: string; purpose: ReviewPurpose; reviewCycleId: string; choice: AgentChoice; prompt: string };
type LaunchDeps = { sessions: TerminalSessionDao; projects: { findById(projectId: string): Promise<ProjectRecord | null> }; guard: Pick<TerminalOpenGuard, "assertServiceRunning" | "assertPrompt" | "requireCheckout" | "assertTools" | "assertSkills">; delivery: SessionAttachmentDelivery; context: SessionContextBuilder; log: TerminalLog; hostId: string; purposes: { confirm(input: { resolved: ResolvedPurpose; actorId: string; sessionId: string }): Promise<void> }; folders: Pick<SessionFolderService, "resolve">; resolveAccount?: (input: { taskId: string; agent: "claude" | "codex"; actorId: string }) => Promise<string | null> };
type ManualLaunch = { actor: SessionPrincipal; input: { taskId: string; projectId: string; requestKey: string; prompt: string; permissionMode: PermissionMode }; planning: ApprovedPlanning; checkout: VerifiedCheckout; plan: AttachmentPlan; resolved: ResolvedPurpose };
type ManualSessionInput = Pick<ManualLaunch, "actor" | "input" | "planning" | "checkout"> & { choice: ResolvedPurpose["columns"] };

export class SessionLauncher {
  private readonly prepareStep: SessionPrepareStep;
  constructor(private readonly deps: LaunchDeps) {
    this.prepareStep = new SessionPrepareStep(deps);
  }

  async launch(input: LaunchInput): Promise<CreatedTerminalSession> {
    const existing = await this.deps.sessions.findByRequestKey(input.actorId, input.requestKey);
    if (existing && !existing.launchFailedAt) return { session: existing, created: false };
    const { planning, checkout } = await this.preconditions(input);
    const agentAccountId = await this.resolveAccount(input.taskId, input.choice.agent, input.actorId);
    const created = await this.create(this.reviewSessionInput(input, planning, checkout, agentAccountId), EMPTY_PLAN);
    if (!created.created) return created;
    await this.prepare({ session: created.session, prompt: input.prompt, plan: EMPTY_PLAN, route: planning.route, taskId: input.taskId });
    return created;
  }

  async startManual({ actor, input, planning, checkout, plan, resolved }: ManualLaunch) {
    const agentAccountId = await this.resolveAccount(input.taskId, resolved.columns.agent ?? "claude", actor.userId);
    const created = await this.create(this.manualSessionInput({ actor, input, planning, checkout, choice: resolved.columns }, agentAccountId), plan);
    if (!created.created) return openedResult(created.session);
    await this.deps.purposes.confirm({ resolved, actorId: actor.userId, sessionId: created.session.id });
    await this.prepareStep.run(created.session, input.prompt, plan);
    this.deps.log.opened({ sessionId: created.session.id, taskId: input.taskId, route: planning.route });
    return openedResult(created.session, plan.unavailableIssueImages);
  }

  private async preconditions(input: LaunchInput) {
    await this.deps.guard.assertServiceRunning();
    this.deps.guard.assertPrompt(input.prompt);
    const project = await this.deps.projects.findById(input.projectId);
    if (!project) throw new TaskError("project_unavailable");
    const checkout = await this.deps.guard.requireCheckout({ userId: input.actorId, projectId: input.projectId, repository: repositoryOf(project) });
    await this.deps.guard.assertTools(input.choice, input.taskId);
    await this.deps.guard.assertSkills();
    const planning = await this.deps.sessions.approvedPlanning(input.taskId);
    if (!planning) throw new TaskError("planning_not_approved");
    return { planning, checkout: await this.deps.folders.resolve({ taskId: input.taskId, issueNumber: planning.issue.number, checkout }) };
  }

  private async create(input: CreateTerminalSessionInput, plan: AttachmentPlan) {
    return this.deps.sessions.create(input, this.deps.delivery.links(plan));
  }

  private reviewSessionInput(input: LaunchInput, planning: ApprovedPlanning, checkout: VerifiedCheckout, agentAccountId: string | null): CreateTerminalSessionInput {
    return { taskId: input.taskId, projectId: input.projectId, userId: input.actorId, planningDecisionId: planning.decisionId, route: planning.route, requestKey: input.requestKey, checkoutPath: checkout.path, branch: checkout.branch, dirty: checkout.dirty, runtime: "flow_dev", permissionMode: DEFAULT_PERMISSION_MODE, hostId: this.deps.hostId, purpose: input.purpose, agent: input.choice.agent, model: input.choice.model, effort: input.choice.effort, reviewCycleId: input.reviewCycleId, agentAccountId };
  }

  private manualSessionInput({ actor, input, planning, checkout, choice }: ManualSessionInput, agentAccountId: string | null): CreateTerminalSessionInput {
    return { taskId: input.taskId, projectId: input.projectId, userId: actor.userId, planningDecisionId: planning.decisionId, route: planning.route, requestKey: input.requestKey, checkoutPath: checkout.path, branch: checkout.branch, dirty: checkout.dirty, runtime: "flow_dev", permissionMode: input.permissionMode, hostId: this.deps.hostId, ...choice, agentAccountId };
  }

  private resolveAccount(taskId: string, agent: "claude" | "codex", actorId: string) {
    return this.deps.resolveAccount?.({ taskId, agent, actorId }) ?? Promise.resolve(null);
  }

  private async prepare({ session, prompt, plan, route, taskId }: { session: TerminalSessionRecord; prompt: string; plan: AttachmentPlan; route: ApprovedPlanning["route"]; taskId: string }) {
    await this.prepareStep.run(session, prompt, plan);
    this.deps.log.opened({ sessionId: session.id, taskId, route });
  }
}
