import { imageErrorResponse, imageFailure, sessionActor, taskImageController } from "@/lib/http/taskImageRoute";

export const runtime = "nodejs";
const IMMUTABLE_PRIVATE_CACHE = "private, max-age=31536000, immutable";
const LOCKED_DOWN_POLICY = "default-src 'none'; sandbox";

export async function GET(request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const actor = await sessionActor(request);
  if (!actor) return imageFailure("session_required");
  try {
    const { imageId } = await params;
    const image = await taskImageController().read(actor, imageId);
    return new Response(new Uint8Array(image.content), { headers: { "content-type": image.contentType, "content-length": String(image.content.byteLength), "cache-control": IMMUTABLE_PRIVATE_CACHE, "x-content-type-options": "nosniff", "content-security-policy": LOCKED_DOWN_POLICY } });
  } catch (error) { return imageErrorResponse(error); }
}
