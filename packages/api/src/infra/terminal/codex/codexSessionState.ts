import type { ChildProcess } from "node:child_process";
import type { RuntimeExit } from "../../../application/terminal/agentSessionRuntime";
import type { CodexCatalogProbe } from "../../../application/terminal/codexCatalogProbe";
import type { SessionLog } from "../../../application/services/terminal/sessionLog";
import type { CodexProcess } from "./codexProcess";
import type { CodexRpc } from "./codexRpcClient";

export type CodexSessionDeps = { process: CodexProcess; probe: CodexCatalogProbe; log: SessionLog; requestUserInput?: boolean };

export type CodexSessionState = {
  child: ChildProcess | null;
  rpc: CodexRpc | null;
  threadId: string | null;
  turnId: string | null;
  version: string | null;
  startedTurn: boolean;
  failing: boolean;
  closing: boolean;
  abandoned: boolean;
  exited: boolean;
  unsubscribe: Array<() => void>;
};

export function createCodexSessionState(): CodexSessionState {
  return { child: null, rpc: null, threadId: null, turnId: null, version: null, startedTurn: false, failing: false, closing: false, abandoned: false, exited: false, unsubscribe: [] };
}

export function isCodexSessionStopped(state: CodexSessionState) {
  return state.closing || state.abandoned;
}

export function codexExitOutcome(state: CodexSessionState, detail: string): RuntimeExit {
  if (state.closing) return { kind: "ended" };
  return { kind: state.startedTurn ? "crashed" : "failed", detail };
}
