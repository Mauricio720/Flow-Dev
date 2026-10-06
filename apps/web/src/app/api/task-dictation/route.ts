import { createProductionTranscriptionController } from "@flow-dev/api/server";
import { auth } from "@/lib/auth/auth";
import { readBodyWithinLimit } from "@/lib/http/requestBodyLimit";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 11 * 1024 * 1024;
let controller: ReturnType<typeof createProductionTranscriptionController> | undefined;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return failure("origin_denied", 403);
  const body = await readBodyWithinLimit(request, MAX_REQUEST_BYTES);
  if (!body) return failure("audio_too_large", 413);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return failure("session_required", 401);
  try {
    const form = await new Request(request.url, { method: "POST", headers: request.headers, body }).formData();
    const token = form.get("captureToken");
    const file = form.get("file");
    if (typeof token !== "string" || !(file instanceof File)) return failure("invalid_audio", 400);
    const audio = new Uint8Array(await file.arrayBuffer());
    const result = await (controller ??= createProductionTranscriptionController()).transcribe({ userId: session.user.id, sessionId: session.session.id }, { captureToken: token, audio, mimeType: file.type, signal: request.signal });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { return mapFailure(error); }
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const appUrl = process.env.BETTER_AUTH_URL;
  if (!origin || !appUrl) return false;
  try { return new URL(origin).origin === new URL(appUrl).origin; } catch { return false; }
}

function mapFailure(error: unknown) {
  const reason = typeof error === "object" && error !== null && "reason" in error && typeof error.reason === "string" ? error.reason : null;
  if (!reason) return failure("service_unavailable", 503);
  const status = reason === "session_required" ? 401 : reason === "author_required" || reason === "origin_denied" ? 403 : reason === "task_unavailable" ? 404 : reason === "repository_authorization_needed" ? 412 : reason === "audio_too_large" ? 413 : reason === "unsupported_audio_type" ? 415 : reason === "transcription_capacity" || reason === "provider_rate_limited" ? 429 : reason === "invalid_provider_response" ? 502 : reason === "provider_unavailable" || reason === "service_unavailable" ? 503 : reason === "transcription_timeout" ? 504 : reason === "capture_expired" || reason === "capture_active" || reason === "task_complete" || reason === "operation_active" ? 409 : 400;
  return failure(reason, status);
}

function failure(reason: string, status: number) { return Response.json({ error: { reason, message: "Não foi possível transcrever este áudio" } }, { status, headers: { "cache-control": "no-store" } }); }
