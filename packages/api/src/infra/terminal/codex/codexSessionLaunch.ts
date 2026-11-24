import type { RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import { codexStartRequests } from "./codexSessionStart";
import type { CodexRpc } from "./codexRpcClient";
import type { ThreadStartResult } from "./protocol/codexMethods";

export async function openCodexThread(rpc: CodexRpc, input: RuntimeStartInput, requestUserInput?: boolean) {
  const requests = codexStartRequests(input, requestUserInput);
  await rpc.request("initialize", requests.initialize);
  rpc.notify("initialized");
  await rpc.request("skills/extraRoots/set", requests.extraRoots);
  const response = await rpc.request<ThreadStartResult>("thread/start", requests.thread);
  return response.thread.id;
}

export async function startCodexTurn(rpc: CodexRpc, input: RuntimeStartInput, threadId: string) {
  const requests = codexStartRequests(input);
  const response = await rpc.request<{ turn: { id: string } }>("turn/start", requests.turn(threadId));
  return response.turn.id;
}
