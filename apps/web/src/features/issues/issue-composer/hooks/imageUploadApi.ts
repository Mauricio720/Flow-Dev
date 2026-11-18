import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, type ImageScope } from "../issueImageModel";

const UPLOAD_PATH = "/api/task-images";
const UNKNOWN_REASON = "upload_failed";

export class ImageUploadFailure extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

async function failureOf(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  const error = body && typeof body === "object" && "error" in body ? body.error : null;
  const reason = error && typeof error === "object" && "reason" in error ? error.reason : null;
  return new ImageUploadFailure(typeof reason === "string" ? reason : UNKNOWN_REASON);
}

function assertUploadable(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new ImageUploadFailure("unsupported_image_type");
  if (file.size > MAX_IMAGE_BYTES) throw new ImageUploadFailure("image_too_large");
}

export async function uploadIssueImage(scope: ImageScope, file: File) {
  assertUploadable(file);
  const form = new FormData();
  form.set("projectId", scope.projectId);
  if (scope.taskId) form.set("taskId", scope.taskId);
  form.set("file", file, file.name);
  const response = await fetch(UPLOAD_PATH, { method: "POST", body: form }).catch(() => null);
  if (!response) throw new ImageUploadFailure(UNKNOWN_REASON);
  if (!response.ok) throw await failureOf(response);
  const body: unknown = await response.json();
  const imageId = body && typeof body === "object" && "imageId" in body ? body.imageId : null;
  if (typeof imageId !== "string") throw new ImageUploadFailure(UNKNOWN_REASON);
  return imageId;
}
