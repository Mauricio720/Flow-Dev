import { AgentRunError, type AgentRunFailure } from "../../application/agents/localAgentRunner";
import type { AgentProvider } from "../../application/agents/agentTypes";
import type { ProcessResult } from "./agentProcess";
import { PROVIDER_INFO, unavailableDetail } from "./agentProviderInfo";
import { claudeResultEvent } from "./claudeStreamOutput";

const SIGNED_OUT = /not logged in|please run \/login|authentication failed|oauth token (expired|revoked)|invalid api key|401 unauthorized|missing bearer|codex login/i;
const USAGE_LIMIT = /hit your (usage |session |weekly )?limit|usage limit|limit reached|rate.?limit|too many requests/i;
const MODEL_UNAVAILABLE = /selected model|model .*(not found|does not exist|unavailable)|unknown model/i;
const CLAUDE_MODEL_STATUS = 404;
const MODEL_USAGE_LIMIT = /model usage limit/i;
export const CLAUDE_LIMIT_STATUS = 429;
const FAILED_EVENT_TYPES = new Set(["error", "turn.failed"]);

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch { return null; }
}

function claudeSignals(result: ProcessResult) {
  const parsed = claudeResultEvent(result.stdout) ?? parseJson(result.stdout.trim());
  const text = typeof parsed?.result === "string" ? parsed.result : "";
  return { texts: [text, result.stderr], status: typeof parsed?.api_error_status === "number" ? parsed.api_error_status : null };
}

function codexSignals(result: ProcessResult) {
  const messages = result.stdout.split("\n").map((line) => parseJson(line)).filter((event) => event && FAILED_EVENT_TYPES.has(String(event.type)));
  const texts = messages.map((event) => String((event!.error as { message?: string } | undefined)?.message ?? event!.message ?? ""));
  return { texts: [...texts, result.stderr], status: null };
}

function classify(provider: AgentProvider, result: ProcessResult): AgentRunFailure {
  const { texts, status } = provider === "claude" ? claudeSignals(result) : codexSignals(result);
  const text = texts.join("\n");
  if (SIGNED_OUT.test(text)) return "not_signed_in";
  if (isUsageLimit(text) || status === CLAUDE_LIMIT_STATUS) return "usage_limit";
  if (MODEL_UNAVAILABLE.test(text) || status === CLAUDE_MODEL_STATUS) return "model_unavailable";
  return "provider_failed";
}

function detailFor(provider: AgentProvider, failure: AgentRunFailure, exitCode: number | null) {
  const info = PROVIDER_INFO[provider];
  if (failure === "not_signed_in") return unavailableDetail(provider, info.loginHint);
  if (failure === "usage_limit") return info.label;
  return `${info.label} (código de saída ${exitCode ?? "desconhecido"})`;
}

export function classifyFailure(provider: AgentProvider, result: ProcessResult) {
  const failure = classify(provider, result);
  return new AgentRunError(failure, detailFor(provider, failure, result.exitCode), result.exitCode);
}

export function claudeReportsError(stdout: string) {
  return (claudeResultEvent(stdout) ?? parseJson(stdout.trim()))?.is_error === true;
}

export function isUsageLimit(text: string) {
  return USAGE_LIMIT.test(text) && !MODEL_USAGE_LIMIT.test(text);
}

export function withProviderDetail(provider: AgentProvider, error: unknown) {
  if (!(error instanceof AgentRunError)) return error;
  if (error.failure === "missing_binary") return new AgentRunError("missing_binary", unavailableDetail(provider, "executável não encontrado no PATH"));
  if (error.failure === "provider_failed" && !error.detail.includes("código")) return new AgentRunError("provider_failed", PROVIDER_INFO[provider].label);
  return error;
}
