import type { TaskImageDao } from "../../database/dao/taskImageDao";
import type { IssueImageStore } from "../../github/issueImageStore";
import { withAttachmentSection } from "./issueAttachmentRules";
import { TaskError } from "./taskErrors";
import { ISSUE_IMAGE_BRANCH, imageReferenceIds, issueImagePath, resolveImageReferences, type ImageDestination } from "./taskImageRules";

type ImageUpload = { taskId: string; body: string; destination: ImageDestination & { token: string } };

export class IssueImagePublisher {
  constructor(private readonly images: TaskImageDao, private readonly store: IssueImageStore) {}

  async withAttachments(taskId: string, body: string) {
    const attachments = await this.images.attachments(taskId);
    return withAttachmentSection(body, attachments.map((image) => image.id));
  }

  hasImages(body: string) {
    return imageReferenceIds(body).length > 0;
  }

  async resolve(taskId: string, body: string, destination: ImageDestination) {
    const imageIds = imageReferenceIds(body);
    if (!imageIds.length) return body;
    return resolveImageReferences(body, await this.images.forTask(taskId, imageIds), destination);
  }

  async upload({ taskId, body, destination }: ImageUpload) {
    const imageIds = imageReferenceIds(body);
    if (!imageIds.length) return;
    const images = await this.images.forTask(taskId, imageIds);
    if (images.length !== imageIds.length) throw new TaskError("image_unavailable");
    for (const image of images) {
      const content = await this.images.content(image.id);
      if (!content) throw new TaskError("image_unavailable");
      await this.store.put({ ...destination, branch: ISSUE_IMAGE_BRANCH, path: issueImagePath(image), content, message: `Add issue image ${image.id}` });
    }
  }
}
