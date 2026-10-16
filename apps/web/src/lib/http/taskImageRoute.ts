import "server-only";
import { createProductionTaskImageController } from "@flow-dev/api/server";
import { auth } from "@/lib/auth/auth";

const FAILURE_MESSAGE = "Não foi possível processar esta imagem";
const UNKNOWN_FAILURE = "service_unavailable";
const NO_STORE = { "cache-control": "no-store" };
const FAILURE_STATUS: Record<string, number> = {
  invalid_input: 400,
  session_required: 401,
  origin_denied: 403,
  author_required: 403,
  image_permission_denied: 403,
  project_unavailable: 404,
  task_unavailable: 404,
  image_unavailable: 404,
  task_complete: 409,
  image_limit: 409,
  repository_authorization_needed: 412,
  image_too_large: 413,
  unsupported_image_type: 415,
  service_unavailable: 503,
};

let controller: ReturnType<typeof createProductionTaskImageController> | undefined;

export function taskImageController() {
  return (controller ??= createProductionTaskImageController());
}

export async function sessionActor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session ? { userId: session.user.id, sessionId: session.session.id } : null;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const appUrl = process.env.BETTER_AUTH_URL;
  if (!origin || !appUrl) return false;
  try { return new URL(origin).origin === new URL(appUrl).origin; } catch { return false; }
}

export function imageFailure(reason: string) {
  return Response.json({ error: { reason, message: FAILURE_MESSAGE } }, { status: FAILURE_STATUS[reason] ?? FAILURE_STATUS.invalid_input, headers: NO_STORE });
}

export function imageErrorResponse(error: unknown) {
  const reason = typeof error === "object" && error !== null && "reason" in error && typeof error.reason === "string" ? error.reason : UNKNOWN_FAILURE;
  return imageFailure(reason);
}

export function imageCreated(body: object) {
  return Response.json(body, { status: 201, headers: NO_STORE });
}
