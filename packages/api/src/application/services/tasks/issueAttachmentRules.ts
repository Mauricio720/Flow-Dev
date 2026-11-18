import { TaskError } from "./taskErrors";
import { imageReferenceIds } from "./taskImageRules";

export const MAX_MESSAGE_IMAGES = 10;
export const MAX_STAGED_IMAGES = 30;
const ATTACHMENT_HEADING = "## Imagens anexadas";
const ATTACHMENT_ALT = "Imagem anexada";

export function validateMessageImages(imageIds: string[]) {
  const unique = [...new Set(imageIds)];
  if (unique.length > MAX_MESSAGE_IMAGES) throw new TaskError("image_limit");
  return unique;
}

export function withAttachmentSection(body: string, imageIds: string[]) {
  const referenced = new Set(imageReferenceIds(body));
  const pending = imageIds.filter((imageId) => !referenced.has(imageId));
  if (!pending.length) return body;
  const images = pending.map((imageId, index) => `![${ATTACHMENT_ALT} ${index + 1}](flow-image:${imageId})`);
  return [body, ATTACHMENT_HEADING, ...images].join("\n\n");
}
