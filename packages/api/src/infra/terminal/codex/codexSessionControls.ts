import type { ChildProcess } from "node:child_process";
import type { CodexProcess } from "./codexProcess";
import type { CodexRpc } from "./codexRpcClient";
import type { SessionLog } from "../../../application/services/terminal/sessionLog";
import type { ThreadUnsubscribeRequest } from "./protocol/codexMethods";

const UNSUBSCRIBE_TIMEOUT_MS = 300;

export async function interruptCodexTurn(rpc: CodexRpc | null, threadId: string | null, turnId: string | null) {
  if (!rpc || !threadId || !turnId) return;
  await rpc.request("turn/interrupt", { threadId, turnId });
}

export async function stopCodexProcess(process: CodexProcess, child: ChildProcess | null, detach: () => void) {
  detach();
  if (child) await process.terminate(child);
}

export async function unsubscribeCodexThread(rpc: CodexRpc | null, threadId: string | null) {
  if (!rpc || !threadId) return;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, UNSUBSCRIBE_TIMEOUT_MS);
    void rpc.request("thread/unsubscribe", { threadId } satisfies ThreadUnsubscribeRequest).catch(() => undefined).finally(() => { clearTimeout(timeout); resolve(); });
  });
}

export function logCodexProcess(log: SessionLog, input: { event: "codex_app_server_started" | "codex_app_server_exited"; sessionId: string; version: string | null; pid: number | null; code?: number | null; signal?: NodeJS.Signals | null }) {
  log.info(input.event, { agent: "codex", sessionId: input.sessionId, version: input.version, pid: input.pid, code: input.code ?? null, signal: input.signal ?? null });
}

export function logCodexRequest(log: SessionLog, sessionId: string, method: string) {
  log.info("codex_request", { agent: "codex", sessionId, method });
}

export function codexFailureMethod(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /^Codex RPC ([^:]+):/.exec(message)?.[1] ?? "startup";
}
