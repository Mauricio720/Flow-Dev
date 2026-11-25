import type { TaskDao } from "../application/database/dao/taskDao";
import type { TaskPublicationWorkerDao, PublicationWorkerClaim } from "../application/database/dao/taskPublicationWorkerDao";
import type { GitHubIssueGateway, GitHubIssueLabelGateway } from "../application/github/issueGateway";
import type { ReadyAssignmentService } from "../application/services/tasks/readyAssignmentService";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { previewHash, parseIssueDraft, validatePublicationDraft } from "../application/services/tasks/draftRules";
import { defineTaskLabels } from "../application/services/tasks/labelDefinitions";
import type { IssueDraft } from "../application/services/tasks/taskContracts";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { IssueImagePublisher } from "../application/services/tasks/issueImagePublisher";

export class TaskPublicationWorkerController {
  constructor(private readonly claims: TaskPublicationWorkerDao, private readonly tasks: TaskDao, private readonly repositories: RepositoryAccessService, private readonly github: GitHubIssueGateway, private readonly workerId = crypto.randomUUID(), private readonly readyAssignment?: ReadyAssignmentService, private readonly labels?: GitHubIssueLabelGateway, private readonly images?: IssueImagePublisher) {}

  async tick() {
    const claim = await this.claims.claim(this.workerId);
    if (!claim) return false;
    return this.dispatch(claim);
  }

  private async dispatch(claim: PublicationWorkerClaim) {
    let fenced = false;
    let heartbeatFailure: unknown;
    const timer = setInterval(() => { void this.claims.heartbeat(claim).catch((error) => { heartbeatFailure = error; }); }, 15_000);
    try {
      const context = await this.authorizedContext(claim);
      const { draft, draftBody } = await this.assertSnapshot(claim, context);
      if (heartbeatFailure) throw new TaskError("stale_execution");
      if (!await this.claims.sessionActive(claim)) throw new TaskError("access_revoked");
      await this.defineLabels(claim, context.token, draft);
      await this.images?.upload({ taskId: claim.taskId, body: draftBody, destination: { owner: claim.owner, name: claim.name, token: context.token } });
      if (claim.assignToSelf && (!context.eligibility.publisherLogin || !this.readyAssignment)) throw new TaskError("provider_unavailable");
      if (claim.assignToSelf) await this.readyAssignment!.assertPossible({ projectId: claim.projectId, token: context.token, assignToSelf: true, canWriteContents: context.eligibility.canWriteContents === true });
      if (!await this.claims.fenceDispatch(claim)) return true;
      fenced = true;
      const outcome = await this.github.create({ repositoryId: claim.repositoryId, owner: claim.owner, name: claim.name, token: context.token, publisherGithubId: claim.publisherGithubId, title: claim.title, body: claim.bodyMarkdown, labels: draft.labels, ...(claim.assignToSelf ? { assignees: [context.eligibility.publisherLogin!] } : {}) });
      await this.settle(claim, outcome, fenced);
      if (outcome.status === "created") await this.readyAssignment?.settle({ claim, token: context.token, receipt: outcome.receipt, priorityPoints: draft.priorityPoints });
    } catch (error) {
      const reason = safeReason(error);
      await this.settle(claim, { status: fenced ? "uncertain" : "rejected", reason }, fenced);
    } finally {
      clearInterval(timer);
    }
    return true;
  }

  private async defineLabels(claim: PublicationWorkerClaim, token: string, draft: IssueDraft) {
    if (!this.labels) return;
    await defineTaskLabels(this.labels, { destination: { owner: claim.owner, name: claim.name, token }, labels: draft.labels, overwrite: false });
  }

  private async settle(claim: PublicationWorkerClaim, outcome: Parameters<TaskPublicationWorkerDao["settle"]>[1], dispatched: boolean) {
    const retries = outcome.status === "uncertain" ? 1 : 3;
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try { return await this.claims.settle(claim, outcome, dispatched); } catch (error) { if (attempt === retries - 1) throw error; }
    }
  }

  private async authorizedContext(claim: PublicationWorkerClaim) {
    if (!await this.claims.sessionActive(claim)) throw new TaskError("access_revoked");
    const context = await this.repositories.contextCredentials({ userId: claim.publisherUserId, sessionId: claim.sessionId }, claim.projectId);
    if (context.repository.githubId !== claim.repositoryId || context.repository.nodeId !== claim.repositoryNodeId || context.publisherGithubId !== claim.publisherGithubId) throw new TaskError("identity_mismatch");
    const eligibility = await this.github.eligibility({ repositoryId: claim.repositoryId, owner: context.repository.owner, name: context.repository.name, token: context.token, publisherGithubId: claim.publisherGithubId });
    if (eligibility.archived) throw new TaskError("repository_archived");
    if (!eligibility.issuesEnabled) throw new TaskError("issues_disabled");
    if (!eligibility.canRead) throw new TaskError("destination_unavailable");
    if (!eligibility.canCreateIssues) throw new TaskError("issue_permission_denied");
    if (context.repository.owner !== claim.owner || context.repository.name !== claim.name) throw new TaskError("preview_changed");
    return { ...context, eligibility };
  }

  private async assertSnapshot(claim: PublicationWorkerClaim, context: Awaited<ReturnType<RepositoryAccessService["contextCredentials"]>>) {
    const task = await this.tasks.findScoped(claim.projectId, claim.taskId);
    if (!task || task.status !== "publishing" || task.currentRevisionId !== claim.revisionId) throw new TaskError("stale_execution");
    const revision = await this.tasks.findRevision(claim.taskId, claim.revisionId);
    if (!revision) throw new TaskError("invalid_stored_content");
    const draft = parseIssueDraft(revision.canonicalDraft);
    const renderedBody = validatePublicationDraft(draft);
    const draftBody = await this.images?.withAttachments(claim.taskId, renderedBody) ?? renderedBody;
    const bodyMarkdown = await this.images?.resolve(claim.taskId, draftBody, context.repository) ?? draftBody;
    const currentHash = previewHash({ revisionId: claim.revisionId, title: draft.title, body: bodyMarkdown, repositoryId: claim.repositoryId, owner: context.repository.owner, name: context.repository.name, publisherGithubId: claim.publisherGithubId, labels: draft.labels });
    if (draft.title !== claim.title || bodyMarkdown !== claim.bodyMarkdown || currentHash !== claim.previewHash) throw new TaskError("preview_changed");
    return { draft, draftBody };
  }
}

function safeReason(error: unknown) { return error instanceof TaskError ? error.reason : "provider_unavailable"; }
