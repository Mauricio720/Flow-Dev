import { readBodyWithinLimit } from "@/lib/http/requestBodyLimit";
import { attachmentCreated, attachmentErrorResponse, attachmentFailure, attachmentTooLarge, sameOrigin, sessionActor, terminalAttachmentController } from "@/lib/http/terminalAttachmentRoute";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return attachmentFailure("origin_denied");
  const body = await readBodyWithinLimit(request, MAX_FILE_BYTES + MULTIPART_OVERHEAD_BYTES);
  if (!body) return attachmentTooLarge();
  const actor = await sessionActor(request);
  if (!actor) return attachmentFailure("session_required");
  try {
    const input = await uploadInput(request, body);
    if (!input) return attachmentFailure("invalid_input");
    return attachmentCreated(await terminalAttachmentController().upload(actor, input));
  } catch (error) {
    return attachmentErrorResponse(error);
  }
}

async function uploadInput(request: Request, body: Uint8Array<ArrayBuffer>) {
  const form = await new Request(request.url, { method: "POST", headers: request.headers, body }).formData();
  const projectId = form.get("projectId");
  const taskId = form.get("taskId");
  const file = form.get("file");
  if (!isUuid(projectId) || !isUuid(taskId) || !(file instanceof File)) return null;
  return { projectId, taskId, name: file.name, content: new Uint8Array(await file.arrayBuffer()) };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
