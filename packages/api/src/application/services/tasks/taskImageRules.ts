import { TaskError } from "./taskErrors";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TASK_IMAGES = 30;
export const ISSUE_IMAGE_BRANCH = "flow-dev-assets";
const ISSUE_IMAGE_FOLDER = "issue-images";
const GITHUB_ORIGIN = "https://github.com";
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const WEBP_TAG_OFFSET = 8;
// Matches the ![alt](flow-image:<uuid>) references that the draft editor writes.
const IMAGE_REFERENCE = /!\[([^\]]*)\]\(flow-image:([0-9a-f-]{36})\)/g;

export const IMAGE_EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" } as const;
export type ImageContentType = keyof typeof IMAGE_EXTENSIONS;
export type StoredImage = { id: string; taskId: string; contentType: string };
export type ImageDestination = { owner: string; name: string };

export function imageContentType(content: Uint8Array): ImageContentType {
  if (content.byteLength === 0) throw new TaskError("unsupported_image_type");
  if (content.byteLength > MAX_IMAGE_BYTES) throw new TaskError("image_too_large");
  if (startsWith(content, PNG_SIGNATURE)) return "image/png";
  if (startsWith(content, JPEG_SIGNATURE)) return "image/jpeg";
  if (asciiAt(content, 0, "GIF87a") || asciiAt(content, 0, "GIF89a")) return "image/gif";
  if (asciiAt(content, 0, "RIFF") && asciiAt(content, WEBP_TAG_OFFSET, "WEBP")) return "image/webp";
  throw new TaskError("unsupported_image_type");
}

export function imageReferenceIds(body: string) {
  return [...new Set([...body.matchAll(IMAGE_REFERENCE)].map((match) => match[2]!))];
}

export function issueImagePath(image: StoredImage) {
  const extension = IMAGE_EXTENSIONS[image.contentType as ImageContentType];
  if (!extension) throw new TaskError("image_unavailable");
  return `${ISSUE_IMAGE_FOLDER}/${image.taskId}/${image.id}.${extension}`;
}

export function issueImageUrl(destination: ImageDestination, image: StoredImage) {
  const repository = `${encodeURIComponent(destination.owner)}/${encodeURIComponent(destination.name)}`;
  return `${GITHUB_ORIGIN}/${repository}/blob/${ISSUE_IMAGE_BRANCH}/${issueImagePath(image)}?raw=true`;
}

export function resolveImageReferences(body: string, images: StoredImage[], destination: ImageDestination) {
  const byId = new Map(images.map((image) => [image.id, image]));
  return body.replace(IMAGE_REFERENCE, (_reference, alt: string, imageId: string) => {
    const image = byId.get(imageId);
    if (!image) throw new TaskError("image_unavailable");
    return `![${alt}](${issueImageUrl(destination, image)})`;
  });
}

function startsWith(content: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => content[index] === byte);
}

function asciiAt(content: Uint8Array, offset: number, text: string) {
  return [...text].every((character, index) => content[offset + index] === character.charCodeAt(0));
}
