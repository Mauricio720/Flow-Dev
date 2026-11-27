import { TRPC_BAD_REQUEST, TRPC_CONFLICT, TRPC_NOT_FOUND, TRPC_UNAUTHORIZED } from "@/lib/projects/contract";
import { trpc } from "@/lib/trpc/client";
import { trpcCode } from "@/lib/trpc/error";
import { ACCOUNT_GENERIC_FAILURE } from "./agentAccountActionCopy";
import type { AgentAccount, AgentAccountProvider } from "./types";

export type AccountFailure = { kind: "unauthorized" } | { kind: "failed"; message: string };
export type AccountOutcome = { kind: "saved"; account: AgentAccount } | AccountFailure;
export type RemovalOutcome = { kind: "removed" } | AccountFailure;

const SERVER_MESSAGE_CODES = new Set<string>([TRPC_BAD_REQUEST, TRPC_CONFLICT, TRPC_NOT_FOUND]);

function failure(error: unknown): AccountFailure {
  const code = String(trpcCode(error));
  if (code === TRPC_UNAUTHORIZED) return { kind: "unauthorized" };
  const showServerMessage = error instanceof Error && SERVER_MESSAGE_CODES.has(code);
  return { kind: "failed", message: showServerMessage ? error.message : ACCOUNT_GENERIC_FAILURE };
}

async function saved(request: Promise<AgentAccount>): Promise<AccountOutcome> {
  try {
    return { kind: "saved", account: await request };
  } catch (error) {
    return failure(error);
  }
}

export function requestCreate(input: { provider: AgentAccountProvider; label: string }) {
  return saved(trpc.agentAccounts.create.mutate(input));
}

export function requestVerify(id: string) {
  return saved(trpc.agentAccounts.verify.mutate({ id }));
}

export function requestRename(input: { id: string; label: string; version: number }) {
  return saved(trpc.agentAccounts.rename.mutate(input));
}

export async function requestRemove(id: string): Promise<RemovalOutcome> {
  try {
    await trpc.agentAccounts.remove.mutate({ id });
    return { kind: "removed" };
  } catch (error) {
    return failure(error);
  }
}
