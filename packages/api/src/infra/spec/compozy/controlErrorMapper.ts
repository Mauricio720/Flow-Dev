import type { ControlErrorCode } from "../../../application/software/controlErrors";

const UNAUTHENTICATED_STATUSES = [401, 403];
const UNPROCESSABLE_STATUS = 422;
const SERVER_ERROR_FLOOR = 500;

export function mapControlStatus(status: number): ControlErrorCode {
  if (UNAUTHENTICATED_STATUSES.includes(status)) return "auth_required";
  if (status === UNPROCESSABLE_STATUS) return "model_unavailable";
  if (status >= SERVER_ERROR_FLOOR) return "service_unavailable";
  return "runtime_incompatible";
}
