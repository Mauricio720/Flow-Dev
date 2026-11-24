import type { RuntimeExit, RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import { codexFailureMethod, logCodexProcess } from "./codexSessionControls";
import { codexExitOutcome, type CodexSessionDeps, type CodexSessionState } from "./codexSessionState";

export type CodexExitContext = { input: RuntimeStartInput; deps: CodexSessionDeps; state: CodexSessionState };

export function detachCodexSession(state: CodexSessionState) {
  for (const remove of state.unsubscribe.splice(0)) remove();
  state.rpc?.close();
}

export function finishCodexSession({ input, state }: CodexExitContext, outcome: RuntimeExit) {
  if (state.exited || state.abandoned) return;
  state.exited = true;
  detachCodexSession(state);
  input.handlers.onExit(outcome);
}

export function handleCodexProcessExit(context: CodexExitContext, exit: { code: number | null; signal: NodeJS.Signals | null }) {
  const { input, deps, state } = context;
  if (state.failing) return;
  logCodexProcess(deps.log, { event: "codex_app_server_exited", sessionId: input.sessionId, version: state.version, pid: state.child?.pid ?? null, ...exit });
  finishCodexSession(context, codexExitOutcome(state, `Codex app-server exited (${exit.signal ?? exit.code})`));
}

export async function failCodexSession(context: CodexExitContext, error: unknown) {
  const { input, deps, state } = context;
  state.failing = true;
  const detail = error instanceof Error ? error.message : String(error);
  deps.log.error("codex_start_failed", { sessionId: input.sessionId, method: codexFailureMethod(error), version: state.version });
  if (state.child) await deps.process.terminate(state.child);
  finishCodexSession(context, { kind: state.startedTurn ? "crashed" : "failed", detail });
}
