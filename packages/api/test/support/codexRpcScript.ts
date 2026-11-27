import type { RpcMessage } from "../../src/infra/terminal/codex/codexRpcFrames";

export type CodexRpcScript = { methods: string[]; results: Record<string, unknown>; errors?: Record<string, { code: number; message: string }>; order?: string[]; batch?: boolean; recordPath?: string; envRecordPath?: string; envRecordNames?: string[]; serverResponsesPath?: string; waitForPath?: string; childPidPath?: string; notification?: RpcMessage; notificationsByMethod?: Record<string, RpcMessage[]>; serverRequest?: RpcMessage; serverRequestsByMethod?: Record<string, RpcMessage[]>; serverRequestsByMethodOnce?: Record<string, RpcMessage[]>; eofMethods?: string[]; exitAfterMethods?: string[] };

export function readRpcScript(source: string): CodexRpcScript {
  const value = JSON.parse(source) as CodexRpcScript;
  if (!Array.isArray(value.methods) || !value.results) throw new Error("Invalid Codex RPC test script");
  return value;
}

export function framed(message: RpcMessage) {
  return `${JSON.stringify(message)}\n`;
}

export function fragments(value: string, size = 7) {
  const parts: string[] = [];
  for (let start = 0; start < value.length; start += size) parts.push(value.slice(start, start + size));
  return parts;
}
