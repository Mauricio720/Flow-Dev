import { createHash } from "node:crypto";
import type { TaskDao } from "../application/database/dao/taskDao";
import type { TaskImageDao } from "../application/database/dao/taskImageDao";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { TaskError } from "../application/services/tasks/taskErrors";
import { MAX_TASK_IMAGES, imageContentType } from "../application/services/tasks/taskImageRules";
import type { SessionPrincipal } from "../context";
import { normalizeTaskError } from "./taskErrorMapper";

const CLOSED_STATUSES = ["publishing", "publication_uncertain", "published"];

type ImageUpload = { projectId: string; taskId: string; content: Uint8Array };

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
    await this.requireEditableTask(actor, input);
    const contentType = imageContentType(input.content);
    const sha256 = createHash("sha256").update(input.content).digest("hex");
    const stored = await this.images.store({ taskId: input.taskId, projectId: input.projectId, uploadedByUserId: actor.userId, contentType, sha256, content: input.content }, MAX_TASK_IMAGES);
    if (stored.status === "limit_reached") throw new TaskError("image_limit");
    return { imageId: stored.image.id, contentType: stored.image.contentType, byteSize: stored.image.byteSize };
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

  private async requireEditableTask(actor: SessionPrincipal, input: Pick<ImageUpload, "projectId" | "taskId">) {
    await this.repositories.requireRead(actor, input.projectId);
    await this.repositories.authoring.requireAdmin(actor);
    const task = await this.tasks.findScoped(input.projectId, input.taskId);
    if (!task) throw new TaskError("task_unavailable");
    if (task.authorUserId !== actor.userId) throw new TaskError("author_required");
    if (CLOSED_STATUSES.includes(task.status)) throw new TaskError("task_complete");
  }
}
