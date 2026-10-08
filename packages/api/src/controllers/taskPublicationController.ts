import type { TaskDao } from "../application/database/dao/taskDao";
import type { TaskPublicationDao, PublicationAccepted } from "../application/database/dao/taskPublicationDao";
import type { GitHubIssueGateway } from "../application/github/issueGateway";
import type { SessionPrincipal } from "../context";
import type { BacklogPlacementService } from "../application/services/projects/backlogPlacementService";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { previewHash, parseIssueDraft, validatePublicationDraft } from "../application/services/tasks/draftRules";
import { TaskError } from "../application/services/tasks/taskErrors";

type Scope = { projectId: string; taskId: string };

export class TaskPublicationController {
  constructor(private readonly tasks: TaskDao, private readonly publications: TaskPublicationDao, private readonly repositories: RepositoryAccessService, private readonly github: GitHubIssueGateway, private readonly backlog?: BacklogPlacementService) {}

  async preview(actor: SessionPrincipal, input: Scope & { revisionId: string }) {
    const resolved = await this.resolvePreview(actor, input, false);
    return { ...resolved.preview, status: "ready" as const };
  }

  async publish(actor: SessionPrincipal, input: Scope & { requestKey: string; expectedVersion: number; revisionId: string; repositoryId: string; previewHash: string }) {
    if (!actor.sessionId) throw new TaskError("session_required");
    await this.requireAuthor(actor, input);
    const replay = await this.publications.accepted({ ...input, actorUserId: actor.userId });
    if (replay) return stripCreated(replay);
    const resolved = await this.resolvePreview(actor, input, false);
    assertPreviewMatches(input, resolved.preview);
    const accepted = await this.publications.approve({ ...input, actorUserId: actor.userId, sessionId: actor.sessionId, repositoryNodeId: resolved.repository.nodeId, publisherGithubId: resolved.publisherGithubId, owner: resolved.repository.owner, name: resolved.repository.name, title: resolved.preview.title, bodyMarkdown: resolved.preview.bodyMarkdown });
    return stripCreated(accepted);
  }

  async reconcilePublication(actor: SessionPrincipal, input: Scope & { requestKey: string; expectedVersion: number; attemptId: string }) {
    await this.requireAuthor(actor, input);
    return this.publications.reconciliation(input.taskId, input.attemptId, input.projectId, actor.userId, input.expectedVersion, input.requestKey);
  }

  private async resolvePreview(actor: SessionPrincipal, input: Scope & { revisionId: string }, allowPublishing: boolean) {
    const task = await this.requireAuthor(actor, input);
    if (!readiness(task, input.revisionId, allowPublishing)) throw new TaskError("preview_not_ready");
    const revision = await this.tasks.findRevision(task.id, input.revisionId);
    if (!revision) throw new TaskError("preview_not_ready");
    const draft = parseIssueDraft(revision.canonicalDraft);
    const bodyMarkdown = validatePublicationDraft(draft);
    const context = await this.repositories.contextCredentials(actor, input.projectId);
    if (context.repository.githubId !== task.repositoryId || context.repository.nodeId !== task.repositoryNodeId) throw new TaskError("destination_unavailable");
    const publisherGithubId = context.publisherGithubId;
    if (!publisherGithubId) throw new TaskError("repository_authorization_needed");
    const publisherLogin = await this.assertEligibility(context.repository, context.token, publisherGithubId);
    await this.backlog?.assertAuthorized({ projectId: input.projectId, token: context.token });
    const hash = previewHash({ revisionId: revision.id, title: draft.title, body: bodyMarkdown, repositoryId: task.repositoryId, owner: context.repository.owner, name: context.repository.name, publisherGithubId, labels: draft.labels });
    return { repository: context.repository, token: context.token, publisherGithubId, preview: { projectId: task.projectId, taskId: task.id, revisionId: revision.id, version: task.version, repositoryId: task.repositoryId, repository: { id: task.repositoryId, owner: context.repository.owner, name: context.repository.name }, publisherGithubId, publisher: { githubId: publisherGithubId, login: publisherLogin }, title: draft.title, bodyMarkdown, labels: draft.labels, previewHash: hash } };
  }

  private async assertEligibility(repository: Awaited<ReturnType<RepositoryAccessService["contextCredentials"]>>["repository"], token: string, publisherGithubId: string) {
    const eligibility = await this.github.eligibility({ repositoryId: repository.githubId, owner: repository.owner, name: repository.name, token, publisherGithubId });
    if (eligibility.repositoryId !== repository.githubId || eligibility.owner !== repository.owner || eligibility.name !== repository.name || eligibility.publisherGithubId !== publisherGithubId) throw new TaskError("identity_mismatch");
    if (eligibility.archived) throw new TaskError("repository_archived");
    if (!eligibility.issuesEnabled) throw new TaskError("issues_disabled");
    if (!eligibility.canRead) throw new TaskError("destination_unavailable");
    if (!eligibility.canCreateIssues) throw new TaskError("issue_permission_denied");
    return eligibility.publisherLogin ?? null;
  }

  private async requireAuthor(actor: SessionPrincipal, input: Scope) {
    await this.repositories.requireRead(actor, input.projectId);
    await this.repositories.authoring.requireAdmin(actor);
    const task = await this.tasks.findScoped(input.projectId, input.taskId);
    if (!task) throw new TaskError("task_unavailable");
    if (task.authorUserId !== actor.userId) throw new TaskError("author_required");
    return task;
  }
}

function readiness(task: Awaited<ReturnType<TaskPublicationController["requireAuthor"]>>, revisionId: string, allowPublishing: boolean) {
  return task.currentRevisionId === revisionId && !task.pendingProposalOperationId && (allowPublishing ? task.status === "publishing" : task.status === "draft_ready" && !task.activeOperationId);
}
function assertPreviewMatches(input: { expectedVersion: number; revisionId: string; repositoryId: string; previewHash: string }, preview: { version: number; revisionId: string; repositoryId: string; previewHash: string }) {
  if (input.expectedVersion !== preview.version) throw new TaskError("revision_conflict");
  if (input.revisionId !== preview.revisionId || input.repositoryId !== preview.repositoryId || input.previewHash !== preview.previewHash) throw new TaskError("preview_changed");
}
function stripCreated(accepted: PublicationAccepted) { const { created: _created, ...result } = accepted; return result; }
