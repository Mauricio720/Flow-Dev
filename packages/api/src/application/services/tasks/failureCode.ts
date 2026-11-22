import { AgentRunError } from "../../agents/localAgentRunner";
import { TaskError } from "./taskErrors";

const DETAIL_SEPARATOR = "|";
const DETAIL_PATTERN = /^[\p{L}\p{N} .,:;()`'\/-]{1,160}$/u;

export function withFailureDetail(reason: string, detail?: string) {
  if (!detail || !DETAIL_PATTERN.test(detail)) return reason;
  return `${reason}${DETAIL_SEPARATOR}${detail}`;
}

export function splitFailureCode(code: string): { reason: string; detail?: string } {
  const index = code.indexOf(DETAIL_SEPARATOR);
  if (index < 0) return { reason: code };
  return { reason: code.slice(0, index), detail: code.slice(index + 1) };
}

export function agentFailureDetail(error: unknown) {
  return error instanceof TaskError && error.cause instanceof AgentRunError ? error.cause.detail : undefined;
}
