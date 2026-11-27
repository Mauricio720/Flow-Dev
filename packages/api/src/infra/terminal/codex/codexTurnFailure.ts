import { isUsageLimit } from "../../agents/agentFailure";
import type { ThreadNotification } from "./protocol/codexMethods";
import type { TurnError } from "./protocol/generated/v2/TurnError";

const ERROR_METHOD = "error";
const TURN_COMPLETED_METHOD = "turn/completed";
const FAILED_TURN_STATUS = "failed";
const USAGE_LIMIT_ERROR_INFO = "usageLimitExceeded";

export class CodexUsageLimitFailure extends Error {
  readonly limit = true;
}

function finalTurnError(method: string, params: ThreadNotification): TurnError | null {
  if (method === ERROR_METHOD && params.willRetry === false) return params.error ?? null;
  if (method === TURN_COMPLETED_METHOD && params.turn?.status === FAILED_TURN_STATUS) return params.turn.error ?? null;
  return null;
}

export function codexUsageLimitOf(method: string, params: ThreadNotification): CodexUsageLimitFailure | null {
  const error = finalTurnError(method, params);
  if (!error) return null;
  const limited = error.codexErrorInfo === USAGE_LIMIT_ERROR_INFO || isUsageLimit(error.message);
  return limited ? new CodexUsageLimitFailure(error.message) : null;
}
