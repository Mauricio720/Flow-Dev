import { readBodyWithinLimit } from "@/lib/http/requestBodyLimit";
import { imageCreated, imageErrorResponse, imageFailure, sameOrigin, sessionActor, taskImageController } from "@/lib/http/taskImageRoute";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 6 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return imageFailure("origin_denied");
  const body = await readBodyWithinLimit(request, MAX_REQUEST_BYTES);
  if (!body) return imageFailure("image_too_large");
  const actor = await sessionActor(request);
  if (!actor) return imageFailure("session_required");
  try {
    const input = await uploadInput(request, body);
    if (!input) return imageFailure("invalid_input");
    return imageCreated(await taskImageController().upload(actor, input));
  } catch (error) { return imageErrorResponse(error); }
}

async function uploadInput(request: Request, body: Uint8Array<ArrayBuffer>) {
  const form = await new Request(request.url, { method: "POST", headers: request.headers, body }).formData();
  const projectId = form.get("projectId");
  const taskId = form.get("taskId");
  const file = form.get("file");
  if (!isUuid(projectId) || !isUuid(taskId) || !(file instanceof File)) return null;
  return { projectId, taskId, content: new Uint8Array(await file.arrayBuffer()) };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
