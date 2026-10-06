import { createProductionTranscriptionController } from "@flow-dev/api/server";
import { auth } from "@/lib/auth/auth";
import { readBodyWithinLimit } from "@/lib/http/requestBodyLimit";

export const runtime = "nodejs";
const BODY_LIMIT = 16 * 1024;
let controller: ReturnType<typeof createProductionTranscriptionController> | undefined;
type PreflightInput = { action: "start" | "cancel"; projectId: string; taskId?: string; expectedVersion?: number; captureId?: string };

export async function POST(request: Request) {
  if (!sameOrigin(request)) return failure("origin_denied", 403);
  const body = await readBodyWithinLimit(request, BODY_LIMIT);
  if (!body) return failure("invalid_input", 413);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return failure("session_required", 401);
  try {
    const input = parseInput(JSON.parse(new TextDecoder().decode(body)));
    if (!input) return failure("invalid_input", 400);
    const result = await (controller ??= createProductionTranscriptionController()).preflight({ userId: session.user.id, sessionId: session.session.id }, input);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { return mapFailure(error); }
}

function parseInput(value: unknown): PreflightInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (!(input.action === "start" || input.action === "cancel") || !isUuid(input.projectId)) return null;
  if (input.taskId !== undefined && !isUuid(input.taskId)) return null;
  if (input.expectedVersion !== undefined && (!Number.isInteger(input.expectedVersion) || Number(input.expectedVersion) <= 0)) return null;
  if (input.captureId !== undefined && !isUuid(input.captureId)) return null;
  if (input.action === "cancel" && input.captureId === undefined) return null;
  return input as PreflightInput;
}

function isUuid(value: unknown): value is string { return typeof value === "string" && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value); }

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const appUrl = process.env.BETTER_AUTH_URL;
  if (!origin || !appUrl) return false;
  try { return new URL(origin).origin === new URL(appUrl).origin; } catch { return false; }
}

function mapFailure(error: unknown) {
  if (error instanceof SyntaxError) return failure("invalid_input", 400);
  const reason = errorReason(error);
  if (!reason) return failure("service_unavailable", 503);
  const status = reason === "session_required" ? 401 : reason === "author_required" ? 403 : reason === "task_unavailable" ? 404 : reason === "repository_authorization_needed" ? 412 : reason === "capture_active" || reason === "revision_conflict" || reason === "task_complete" ? 409 : reason === "transcription_capacity" ? 429 : reason === "invalid_input" ? 400 : 503;
  return failure(reason, status);
}

function errorReason(error: unknown) { return typeof error === "object" && error !== null && "reason" in error && typeof error.reason === "string" ? error.reason : null; }
function failure(reason: string, status: number) { return Response.json({ error: { reason, message: "Não foi possível iniciar a captura" } }, { status, headers: { "cache-control": "no-store" } }); }
