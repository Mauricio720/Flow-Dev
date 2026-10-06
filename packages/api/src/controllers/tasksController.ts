import type { TaskDao } from "../application/database/dao/taskDao";
import { mapTaskSummary } from "../application/database/dao/taskDao";
import type { SessionPrincipal } from "../context";
import { parseIssueDraft, renderIssueBody, storedDraftLabels } from "../application/services/tasks/draftRules";
import { validateHistorySearch, validateUserMessage } from "../application/services/tasks/inputRules";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { buildManualEvidenceBindings } from "../application/services/tasks/draftSourceBindings";
import { publicationDto, revisionDto, summaryDto } from "./mappers/taskDtoMapper";
import { planningDto } from "./mappers/planningDtoMapper";
export { mapTaskError } from "./taskErrorMapper";

export class TasksController {
  constructor(private readonly dao: TaskDao, private readonly repositories: RepositoryAccessService) {}

  async list(actor: SessionPrincipal, input: { projectId: string; search?: string; cursor?: string; limit: number }) {
    await this.repositories.requireRead(actor, input.projectId);
    validateHistorySearch(input.search);
    const page = await this.dao.list(input);
    const authorNames = await this.dao.authorNames([...new Set(page.items.map((item) => item.authorUserId))]);
    return { ...page, items: page.items.map((item) => summaryDto(item, authorNames)) };
  }

  async byId(actor: SessionPrincipal, input: { projectId: string; taskId: string }) {
    await this.repositories.requireRead(actor, input.projectId);
    return this.dao.snapshot((dao) => this.readWorkspace(dao, actor, input));
  }

  private async readWorkspace(dao: TaskDao, actor: SessionPrincipal, input: { projectId: string; taskId: string }) {
    const task = await dao.findScoped(input.projectId, input.taskId);
    if (!task) throw new TaskError("task_unavailable");
    const [revision, pendingProposal, publication, activity, authorNames, planning] = await Promise.all([dao.currentRevision(task.id), dao.pendingProposal(task.id), dao.publication(task.id), dao.activity(task.id), dao.authorNames([task.authorUserId]), dao.planning(task.id)]);
    const isAuthor = task.authorUserId === actor.userId;
    return { task: summaryDto(mapTaskSummary(task, revision ? storedDraftLabels(revision.canonicalDraft) : []), authorNames), currentRevision: revision ? revisionDto(revision) : null, pendingProposal, publication: publicationDto(publication), activity, planning: planningDto(planning, { isAuthor }), permissions: { canEdit: isAuthor }, lastError: task.lastError ? { reason: task.lastError } : null };
  }

  async messages(actor: SessionPrincipal, input: { projectId: string; taskId: string; cursor?: string; limit: number }) {
    await this.requireTask(actor, input.projectId, input.taskId);
    return this.dao.messages(input.taskId, input.cursor, input.limit);
  }

  async revisions(actor: SessionPrincipal, input: { projectId: string; taskId: string; cursor?: string; limit: number }) {
    await this.requireTask(actor, input.projectId, input.taskId);
    const page = await this.dao.revisions(input.taskId, input.cursor, input.limit);
    return { ...page, items: page.items.map(revisionDto) };
  }

  async start(actor: SessionPrincipal, input: { projectId: string; requestKey: string; message: string }) {
    const message = validateUserMessage(input.message);
    const repository = await this.repositories.requireRead(actor, input.projectId);
    return this.dao.start({ ...input, actorUserId: actor.userId, sessionId: requireSessionId(actor), repositoryId: repository.githubId, repositoryNodeId: repository.nodeId, message });
  }

  async send(actor: SessionPrincipal, input: { projectId: string; taskId: string; requestKey: string; expectedVersion: number; message: string }) {
    const message = validateUserMessage(input.message);
    const task = await this.requireTask(actor, input.projectId, input.taskId);
    if (task.authorUserId !== actor.userId) throw new TaskError("author_required");
    const kind = task.status === "awaiting_clarification" ? "clarification" : "refinement";
    return this.dao.send({ ...input, actorUserId: actor.userId, sessionId: requireSessionId(actor), message }, kind);
  }

  async submission(actor: SessionPrincipal, input: { projectId: string; action: string; requestKey: string }) {
    await this.repositories.requireRead(actor, input.projectId);
    return (await this.dao.submission({ ...input, actorUserId: actor.userId })) ?? { status: "not_accepted" as const };
  }

  async retryGeneration(actor: SessionPrincipal, input: { projectId: string; taskId: string; requestKey: string; expectedVersion: number; failedOperationId: string }) {
    const task = await this.requireTask(actor, input.projectId, input.taskId);
    if (task.authorUserId !== actor.userId) throw new TaskError("author_required");
    return this.dao.retryGeneration({ ...input, actorUserId: actor.userId, sessionId: requireSessionId(actor) });
  }

  async resolveRefinement(actor: SessionPrincipal, input: { projectId: string; taskId: string; requestKey: string; expectedVersion: number; proposalOperationId: string; decision: "apply" | "discard"; selectedPaths: string[] }) {
    const task = await this.requireTask(actor, input.projectId, input.taskId);
    if (task.authorUserId !== actor.userId) throw new TaskError("author_required");
    return this.dao.resolveRefinement({ ...input, actorUserId: actor.userId });
  }

  async saveDraft(actor: SessionPrincipal, input: { projectId: string; taskId: string; requestKey: string; expectedVersion: number; baseRevisionId: string; draft: unknown; evidenceBindings: unknown[] }) {
    const task = await this.requireTask(actor, input.projectId, input.taskId);
    if (task.authorUserId !== actor.userId) throw new TaskError("author_required");
    const draft = parseIssueDraft(input.draft);
    renderIssueBody(draft);
    const evidenceBindings = buildManualEvidenceBindings(draft, task.repositoryId, await this.dao.evidence(task.id), await this.dao.currentRevision(task.id));
    return this.dao.saveDraft({ ...input, actorUserId: actor.userId, draft, evidenceBindings });
  }

  private async requireTask(actor: SessionPrincipal, projectId: string, taskId: string) {
    await this.repositories.requireRead(actor, projectId);
    const task = await this.dao.findScoped(projectId, taskId);
    if (!task) throw new TaskError("task_unavailable");
    return task;
  }
}

function requireSessionId(actor: SessionPrincipal) { if (!actor.sessionId) throw new TaskError("session_required"); return actor.sessionId; }
