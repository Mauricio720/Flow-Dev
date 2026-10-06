import { trpcCode, trpcData } from "@/lib/trpc/error";
import type { TaskFailure } from "./contract";

export type AccessProblem = "session" | "revoked" | "authorization";

export const TASK_UNAVAILABLE_REASON = "task_unavailable";
const SESSION_CODE = "UNAUTHORIZED";
const INTERNAL_CODE = "INTERNAL_SERVER_ERROR";
const SERVICE_UNAVAILABLE_REASON = "service_unavailable";
const AUTHORIZATION_REASON = "repository_authorization_needed";
const REVOKED_REASONS = ["project_unavailable", "access_revoked"];

function textOf(value: unknown) {
  return typeof value === "string" ? value : null;
}

function reasonIn(source: unknown) {
  return source && typeof source === "object" && "reason" in source ? textOf(source.reason) : null;
}

function causeOf(error: unknown) {
  return error && typeof error === "object" && "cause" in error ? error.cause : null;
}

function retryAfterIn(error: unknown) {
  const data = trpcData(error);
  const seconds = data && "retryAfterSeconds" in data ? data.retryAfterSeconds : null;
  return typeof seconds === "number" && seconds > 0 ? seconds : undefined;
}

export function taskFailure(error: unknown): TaskFailure {
  const retryAfterSeconds = retryAfterIn(error);
  return { code: textOf(trpcCode(error)), reason: reasonIn(trpcData(error)) ?? reasonIn(causeOf(error)), ...(retryAfterSeconds ? { retryAfterSeconds } : {}) };
}

export function accessProblem(failure: TaskFailure | null): AccessProblem | null {
  if (!failure) return null;
  if (failure.code === SESSION_CODE) return "session";
  if (failure.reason === AUTHORIZATION_REASON) return "authorization";
  if (failure.reason && REVOKED_REASONS.includes(failure.reason)) return "revoked";
  return null;
}

export const ACCESS_LOCK_COPY: Record<AccessProblem, string> = {
  session: "Entre novamente para continuar. O que já foi salvo permanece na tarefa.",
  authorization: "Autorize o repositório no GitHub para continuar nesta tarefa.",
  revoked: "Seu acesso a este projeto mudou.",
};

export function isUnconfirmed(failure: TaskFailure) {
  return failure.code === null || failure.code === INTERNAL_CODE;
}

export function isPlanningUnconfirmed(failure: TaskFailure) {
  if (failure.code === null) return true;
  return failure.code === INTERNAL_CODE && (failure.reason === null || failure.reason === SERVICE_UNAVAILABLE_REASON);
}

export function fieldErrorsOf(error: unknown): Record<string, string> {
  const data = trpcData(error);
  const fields = data && "fieldErrors" in data ? data.fieldErrors : null;
  if (!fields || typeof fields !== "object") return {};
  return Object.fromEntries(Object.entries(fields).map(([path, value]) => [path, String(value)]));
}
