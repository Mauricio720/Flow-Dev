import type { RuntimeStartInput } from "../../../application/terminal/agentSessionRuntime";
import { codexThreadOptions } from "./codexThreadOptions";
import type { CodexRpc } from "./codexRpcClient";
import { CODEX_INITIALIZE_REQUEST } from "./codexSessionStart";
import type { ThreadResumeRequest, ThreadResumeResult } from "./protocol/codexMethods";

export type ResumeTarget = { threadId: string; requestUserInput?: boolean };

export async function resumeCodexThread(rpc: CodexRpc, input: RuntimeStartInput, { threadId, requestUserInput }: ResumeTarget) {
  const options = codexThreadOptions({ cwd: input.cwd, choice: input, permissionMode: input.permissionMode, requestUserInput });
  await rpc.request("initialize", CODEX_INITIALIZE_REQUEST);
  rpc.notify("initialized");
  await rpc.request("skills/extraRoots/set", { extraRoots: [`${input.contextDir}/skills`] });
  const request: ThreadResumeRequest = { ...options.resume, threadId };
  const result = await rpc.request<ThreadResumeResult>("thread/resume", request);
  return result.thread.id;
}
