import type { RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import type { CodexRpc } from "./codexRpcClient";
import { codexStartRequests, promptHooks } from "./codexSessionStart";
import type { TurnStartResult } from "./protocol/codexMethods";

const DENIAL_NOTE_PREFIX = "O pedido anterior foi recusado pelo operador:";

export type CodexTurnDispatch = { input: RuntimeStartInput; rpc: CodexRpc; threadId: string; prompt: string };

export function withDenialNote(prompt: string, note: string | null) {
  return note ? `${prompt}\n\n${DENIAL_NOTE_PREFIX} ${note}` : prompt;
}

export async function sendCodexTurn({ input, rpc, threadId, prompt }: CodexTurnDispatch) {
  const turnInput = { ...input, prompt };
  for (const hook of promptHooks(threadId, turnInput)) input.handlers.onHook(hook);
  const response = await rpc.request<TurnStartResult>("turn/start", codexStartRequests(turnInput).turn(threadId));
  return response.turn.id;
}
