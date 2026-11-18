import { createHash } from "node:crypto";
import type { TaskDao } from "../application/database/dao/taskDao";
import type { StagedImageInput, TaskImageDao } from "../application/database/dao/taskImageDao";
import { MAX_STAGED_IMAGES } from "../application/services/tasks/issueAttachmentRules";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { TaskError } from "../application/services/tasks/taskErrors";
import { MAX_TASK_IMAGES, imageContentType } from "../application/services/tasks/taskImageRules";
import type { SessionPrincipal } from "../context";
import { normalizeTaskError } from "./taskErrorMapper";

const CLOSED_STATUSES = ["publishing", "publication_uncertain", "published"];

type ImageUpload = { projectId: string; taskId: string | null; content: Uint8Array };

export class TaskImageController {
  constructor(private readonly tasks: TaskDao, private readonly images: TaskImageDao, private readonly repositories: RepositoryAccessService) {}

  async upload(actor: SessionPrincipal, input: ImageUpload) {
    try { return await this.storeImage(actor, input); }
    catch (error) { throw normalizeTaskError(error); }
  }

  async read(actor: SessionPrincipal, imageId: string) {
    try { return await this.readImage(actor, imageId); }
    catch (error) { throw normalizeTaskError(error); }
  }

  private async storeImage(actor: SessionPrincipal, input: ImageUpload) {
    if (!actor.sessionId) throw new TaskError("session_required");
    await this.requireUploadAccess(actor, input);
    const image = stagedImage(actor, input);
    const stored = input.taskId ? await this.images.store({ ...image, taskId: input.taskId }, MAX_TASK_IMAGES) : await this.images.stage(image, MAX_STAGED_IMAGES);
    if (stored.status === "limit_reached") throw new TaskError("image_limit");
    return { imageId: stored.image.id, contentType: stored.image.contentType, byteSize: stored.image.byteSize };
  }

  private async requireUploadAccess(actor: SessionPrincipal, input: ImageUpload) {
    if (input.taskId) return this.requireEditableTask(actor, { projectId: input.projectId, taskId: input.taskId });
    await this.repositories.requireRead(actor, input.projectId);
    await this.repositories.authoring.requireAdmin(actor);
  }

  private async readImage(actor: SessionPrincipal, imageId: string) {
    if (!actor.sessionId) throw new TaskError("session_required");
    const image = await this.images.find(imageId);
    if (!image) throw new TaskError("image_unavailable");
    await this.repositories.requireRead(actor, image.projectId);
    const content = await this.images.content(image.id);
    if (!content) throw new TaskError("image_unavailable");
    return { contentType: image.contentType, content };
  }

  private async requireEditableTask(actor: SessionPrincipal, input: { projectId: string; taskId: string }) {
    await this.repositories.requireRead(actor, input.projectId);
    await this.repositories.authoring.requireAdmin(actor);
    const task = await this.tasks.findScoped(input.projectId, input.taskId);
    if (!task) throw new TaskError("task_unavailable");
    if (task.authorUserId !== actor.userId) throw new TaskError("author_required");
    if (CLOSED_STATUSES.includes(task.status)) throw new TaskError("task_complete");
  }
}

function stagedImage(actor: SessionPrincipal, input: ImageUpload): StagedImageInput {
  const contentType = imageContentType(input.content);
  const sha256 = createHash("sha256").update(input.content).digest("hex");
  return { projectId: input.projectId, uploadedByUserId: actor.userId, contentType, sha256, content: input.content };
}
