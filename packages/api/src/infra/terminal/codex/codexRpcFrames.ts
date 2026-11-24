import { StringDecoder } from "node:string_decoder";

export type RpcError = { code: number; message: string; data?: unknown };
export type RpcMessage = { jsonrpc: "2.0"; id?: string | number; method?: string; params?: unknown; result?: unknown; error?: RpcError };

export class CodexRpcFrames {
  private readonly decoder = new StringDecoder("utf8");
  private pending = "";

  push(chunk: string | Buffer) {
    this.pending += typeof chunk === "string" ? chunk : this.decoder.write(chunk);
    const messages: RpcMessage[] = [];
    for (;;) {
      const end = this.pending.indexOf("\n");
      if (end < 0) return messages;
      const line = this.pending.slice(0, end).trim();
      this.pending = this.pending.slice(end + 1);
      if (line) messages.push(JSON.parse(line) as RpcMessage);
    }
  }

  finish() {
    this.pending += this.decoder.end();
    if (this.pending.trim()) throw new Error("Codex app-server closed with an incomplete JSON-RPC frame");
  }
}
