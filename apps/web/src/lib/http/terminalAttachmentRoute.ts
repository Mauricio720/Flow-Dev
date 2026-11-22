import "server-only";
import { attachmentFailureMessage, attachmentFailureOf, createProductionTerminalAttachmentController } from "@flow-dev/api/server";

export { sameOrigin, sessionActor } from "@/lib/http/taskImageRoute";

const DEFAULT_FAILURE_MESSAGE = "Não foi possível processar este anexo";
const UNKNOWN_FAILURE = "service_unavailable";
const NO_STORE = { "cache-control": "no-store" };
const FAILURE_STATUS: Record<string, number> = {
  invalid_input: 400,
  session_required: 401,
  origin_denied: 403,
  operator_required: 403,
  project_unavailable: 404,
  task_unavailable: 404,
  work_unavailable: 404,
  attachment_missing: 404,
  attachment_limit: 409,
  attachment_duplicate: 409,
  planning_not_approved: 409,
  claim_unresolved: 412,
  issue_ineligible: 412,
  source_changed: 412,
  repository_authorization_needed: 412,
  attachment_too_large: 413,
  attachment_type_rejected: 415,
  service_unavailable: 503,
};

let controller: ReturnType<typeof createProductionTerminalAttachmentController> | undefined;

export function terminalAttachmentController() {
  return (controller ??= createProductionTerminalAttachmentController());
}

export function attachmentFailure(reason: string, message?: string) {
  const status = FAILURE_STATUS[reason] ?? FAILURE_STATUS[UNKNOWN_FAILURE]!;
  return Response.json({ error: { reason, message: message ?? DEFAULT_FAILURE_MESSAGE } }, { status, headers: NO_STORE });
}

export function attachmentErrorResponse(error: unknown) {
  const failure = attachmentFailureOf(error);
  const known = failure.reason in FAILURE_STATUS ? failure.reason : UNKNOWN_FAILURE;
  return attachmentFailure(known, failure.message);
}

export function attachmentTooLarge() {
  return attachmentFailure("attachment_too_large", attachmentFailureMessage("attachment_too_large"));
}

export function attachmentCreated(body: object) {
  return Response.json(body, { status: 201, headers: NO_STORE });
}

export function attachmentRemoved() {
  return new Response(null, { status: 204, headers: NO_STORE });
}
