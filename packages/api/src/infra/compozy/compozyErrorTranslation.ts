import { CompozyApiError, CompozyConfigError, CompozyUnavailableError } from "@compozy/client";
import { CompozyCallError } from "../../application/compozy/compozyErrors";
import { TaskError } from "../../application/services/tasks/taskErrors";

const NOT_FOUND = 404;
const SERVER_ERROR = 500;
const TRANSPORT_ERROR_NAMES = ["TimeoutError", "AbortError"];

export type CompozyCallContext = { operation: string; taskScoped?: boolean };

export function translateCompozyError(error: unknown, context: CompozyCallContext): unknown {
  if (error instanceof TaskError) return error;
  if (error instanceof CompozyApiError) return apiError(error, context);
  if (error instanceof CompozyConfigError) return new CompozyCallError("compozy_unconfigured", { operation: context.operation }, error);
  if (isTransportFailure(error)) return new CompozyCallError("compozy_unavailable", { operation: context.operation }, error);
  return error;
}

export function isDaemonNotFound(error: unknown) {
  return error instanceof CompozyApiError && error.status === NOT_FOUND;
}

function apiError(error: CompozyApiError, context: CompozyCallContext) {
  const detail = { operation: context.operation, status: error.status, daemonCode: error.code };
  if (error.status >= SERVER_ERROR) return new CompozyCallError("compozy_unavailable", detail, error);
  if (error.status === NOT_FOUND && context.taskScoped) return new CompozyCallError("compozy_task_missing", detail, error);
  return new CompozyCallError("compozy_rejected", detail, error);
}

function isTransportFailure(error: unknown) {
  if (error instanceof CompozyUnavailableError || error instanceof TypeError) return true;
  return error instanceof Error && TRANSPORT_ERROR_NAMES.includes(error.name);
}
