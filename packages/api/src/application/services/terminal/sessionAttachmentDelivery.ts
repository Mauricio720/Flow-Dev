import type { SessionAttachmentLinks } from "../../database/dao/terminalAttachmentLinks";
import type { TerminalAttachmentDao, TerminalAttachmentRecord } from "../../database/dao/terminalAttachmentDao";
import type { AttachmentFileStore } from "../../terminal/attachmentFileStore";
import { TaskError } from "../tasks/taskErrors";
import { MAX_ATTACHMENTS, MAX_ATTACHMENTS_TOTAL_BYTES, safeAttachmentName, storedExtension } from "./attachmentRules";
import { TOTAL_SIZE_KIND } from "./terminalErrorCatalog";
import type { IssueImageSelector, ResolvedIssueImage } from "./issueImageSelector";
import type { PromptAttachment } from "./terminalPromptBuilder";

export type DeliveryItem = { targetName: string; originalName: string; contentType: string; byteSize: number };
export type DeliveryUpload = DeliveryItem & { attachment: TerminalAttachmentRecord };
export type DeliveryImage = DeliveryItem & { image: ResolvedIssueImage };
export type AttachmentPlan = { uploads: DeliveryUpload[]; images: DeliveryImage[]; unavailableIssueImages: number };
export type PlanInput = { userId: string; taskId: string; issueBody: string; attachmentIds: string[]; issueImageIds: string[] };
type DeliveryDeps = { attachments: TerminalAttachmentDao; issueImages: IssueImageSelector; files: AttachmentFileStore };

const unique = (ids: string[]) => [...new Set(ids.map((id) => id.toLowerCase()))];

export const EMPTY_PLAN: AttachmentPlan = { uploads: [], images: [], unavailableIssueImages: 0 };

export class SessionAttachmentDelivery {
  constructor(private readonly deps: DeliveryDeps) {}

  async plan(input: PlanInput): Promise<AttachmentPlan> {
    const uploadIds = unique(input.attachmentIds);
    const staged = await this.deps.attachments.findStaged(input.userId, input.taskId, uploadIds);
    if (staged.length !== uploadIds.length) throw new TaskError("attachment_missing");
    const wanted = new Set(unique(input.issueImageIds));
    const available = (await this.deps.issueImages.resolve(input.taskId, input.issueBody)).filter((image) => wanted.has(image.id.toLowerCase()));
    const ordered = uploadIds.map((id) => staged.find((row) => row.id === id)!);
    assertWithinLimits(available.length + ordered.length, [...available, ...ordered].reduce((total, item) => total + item.byteSize, 0));
    return { uploads: this.uploadItems(ordered, available.length), images: this.imageItems(available), unavailableIssueImages: wanted.size - available.length };
  }

  links(plan: AttachmentPlan): SessionAttachmentLinks {
    const issueImages = plan.images.map((item) => ({ taskImageId: item.image.id, originalName: item.originalName, storedName: item.targetName, contentType: item.contentType, byteSize: item.byteSize, sha256: item.image.sha256 }));
    return { uploadIds: plan.uploads.map((item) => item.attachment.id), issueImages };
  }

  async deliver(plan: AttachmentPlan, input: { userId: string; taskId: string; attachmentsDir: string }): Promise<PromptAttachment[]> {
    const delivered: PromptAttachment[] = [];
    for (const item of plan.images) {
      const content = await this.deps.issueImages.content(input.taskId, item.image.id);
      if (!content) continue;
      delivered.push(this.entry(item, await this.deps.files.writeSessionFile(input.attachmentsDir, item.targetName, content)));
    }
    for (const item of plan.uploads) {
      const path = await this.deps.files.copyToSession({ userId: input.userId, storedName: item.attachment.storedName, attachmentsDir: input.attachmentsDir, targetName: item.targetName });
      delivered.push(this.entry(item, path));
    }
    return delivered;
  }

  async finish(plan: AttachmentPlan, userId: string) {
    for (const item of plan.uploads) await this.deps.files.removeStaged(userId, item.attachment.storedName);
  }

  private entry(item: DeliveryItem, path: string): PromptAttachment {
    return { name: item.originalName, contentType: item.contentType, path };
  }

  private imageItems(images: ResolvedIssueImage[]): DeliveryImage[] {
    return images.map((image, index) => ({ image, originalName: image.name, contentType: image.contentType, byteSize: image.byteSize, targetName: safeAttachmentName(index + 1, image.name, storedExtension(image.name, image.contentType)) }));
  }

  private uploadItems(rows: TerminalAttachmentRecord[], offset: number): DeliveryUpload[] {
    return rows.map((attachment, index) => ({ attachment, originalName: attachment.originalName, contentType: attachment.contentType, byteSize: attachment.byteSize, targetName: safeAttachmentName(offset + index + 1, attachment.originalName, storedExtension(attachment.originalName, attachment.contentType)) }));
  }
}

function assertWithinLimits(count: number, bytes: number) {
  if (count > MAX_ATTACHMENTS) throw new TaskError("attachment_limit");
  if (bytes > MAX_ATTACHMENTS_TOTAL_BYTES) throw new TaskError("attachment_limit", { kind: TOTAL_SIZE_KIND });
}
