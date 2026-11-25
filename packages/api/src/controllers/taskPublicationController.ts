import type { TaskDao } from "../application/database/dao/taskDao";
import type { TaskPublicationDao, PublicationAccepted } from "../application/database/dao/taskPublicationDao";
import type { GitHubIssueGateway } from "../application/github/issueGateway";
import type { SessionPrincipal } from "../context";
import type { ReadyAssignmentService } from "../application/services/tasks/readyAssignmentService";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { previewHash, parseIssueDraft, validatePublicationDraft } from "../application/services/tasks/draftRules";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { IssueImagePublisher } from "../application/services/tasks/issueImagePublisher";
import { assertPublicationEligibility, publicationReadiness } from "./taskPublicationEligibility";

type Scope = { projectId: string; taskId: string };

export class TaskPublicationController {
  constructor(private readonly tasks: TaskDao, private readonly publications: TaskPublicationDao, private readonly repositories: RepositoryAccessService, private readonly github: GitHubIssueGateway, private readonly readyAssignment?: ReadyAssignmentService, private readonly images?: IssueImagePublisher) {}

  async preview(actor: SessionPrincipal, input: Scope & { revisionId: string }) {
    const resolved = await this.resolvePreview(actor, input, false);
    return { ...resolved.preview, status: "ready" as const };
  }

  async publish(actor: SessionPrincipal, input: Scope & { requestKey: string; expectedVersion: number; revisionId: string; repositoryId: string; previewHash: string; assignToSelf?: boolean }) {
    if (!actor.sessionId) throw new TaskError("session_required");
    await this.requireAuthor(actor, input);
    const assignToSelf = input.assignToSelf ?? false;
    const replay = await this.publications.accepted({ ...input, assignToSelf, actorUserId: actor.userId });
    if (replay) return stripCreated(replay);
    const resolved = await this.resolvePreview(actor, { ...input, assignToSelf }, false);
    assertPreviewMatches(input, resolved.preview);
    const accepted = await this.publications.approve({ ...input, assignToSelf, actorUserId: actor.userId, sessionId: actor.sessionId, repositoryNodeId: resolved.repository.nodeId, publisherGithubId: resolved.publisherGithubId, owner: resolved.repository.owner, name: resolved.repository.name, title: resolved.preview.title, bodyMarkdown: resolved.preview.bodyMarkdown });
    return stripCreated(accepted);
  }

  async reconcilePublication(actor: SessionPrincipal, input: Scope & { requestKey: string; expectedVersion: number; attemptId: string }) {
    await this.requireAuthor(actor, input);
    return this.publications.reconciliation(input.taskId, input.attemptId, input.projectId, actor.userId, input.expectedVersion, input.requestKey);
  }

  private async resolvePreview(actor: SessionPrincipal, input: Scope & { revisionId: string; assignToSelf?: boolean }, allowPublishing: boolean) {
    const task = await this.requireAuthor(actor, input);
    if (!publicationReadiness(task, input.revisionId, allowPublishing)) throw new TaskError("preview_not_ready");
    const revision = await this.tasks.findRevision(task.id, input.revisionId);
    if (!revision) throw new TaskError("preview_not_ready");
    const draft = parseIssueDraft(revision.canonicalDraft);
    const renderedBody = validatePublicationDraft(draft);
    const draftBody = await this.images?.withAttachments(task.id, renderedBody) ?? renderedBody;
    const context = await this.repositories.contextCredentials(actor, input.projectId);
    if (context.repository.githubId !== task.repositoryId || context.repository.nodeId !== task.repositoryNodeId) throw new TaskError("destination_unavailable");
    const publisherGithubId = context.publisherGithubId;
    if (!publisherGithubId) throw new TaskError("repository_authorization_needed");
    const eligibility = await assertPublicationEligibility(this.github, context.repository, context.token, publisherGithubId);
    if (this.images?.hasImages(draftBody) && eligibility.canWriteContents !== true) throw new TaskError("image_permission_denied");
    const bodyMarkdown = await this.images?.resolve(task.id, draftBody, context.repository) ?? draftBody;
    await this.readyAssignment?.assertPossible({ projectId: input.projectId, token: context.token, assignToSelf: input.assignToSelf ?? false, canWriteContents: eligibility.canWriteContents === true });
    const hash = previewHash({ revisionId: revision.id, title: draft.title, body: bodyMarkdown, repositoryId: task.repositoryId, owner: context.repository.owner, name: context.repository.name, publisherGithubId, labels: draft.labels });
    return { repository: context.repository, token: context.token, publisherGithubId, preview: { projectId: task.projectId, taskId: task.id, revisionId: revision.id, version: task.version, repositoryId: task.repositoryId, repository: { id: task.repositoryId, owner: context.repository.owner, name: context.repository.name }, publisherGithubId, publisher: { githubId: publisherGithubId, login: eligibility.publisherLogin ?? null }, title: draft.title, bodyMarkdown, labels: draft.labels, previewHash: hash } };
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

function assertPreviewMatches(input: { expectedVersion: number; revisionId: string; repositoryId: string; previewHash: string }, preview: { version: number; revisionId: string; repositoryId: string; previewHash: string }) {
  if (input.expectedVersion !== preview.version) throw new TaskError("revision_conflict");
  if (input.revisionId !== preview.revisionId || input.repositoryId !== preview.repositoryId || input.previewHash !== preview.previewHash) throw new TaskError("preview_changed");
}
function stripCreated(accepted: PublicationAccepted) { const { created: _created, ...result } = accepted; return result; }
