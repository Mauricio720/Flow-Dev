import type { RpcMessage } from "./codexRpcFrames";

export type ServerRequest = { method: string; params: unknown };
export type RpcWrite = (message: RpcMessage) => void;
export class CodexRpcDispatch {
  private readonly notifications = new Set<(method: string, params: unknown) => void>();
  private readonly serverRequests = new Set<(request: ServerRequest) => Promise<unknown>>();
  constructor(private readonly write: RpcWrite, private readonly resolve: (message: RpcMessage) => void) {}
  onNotification(handler: (method: string, params: unknown) => void) { this.notifications.add(handler); return () => this.notifications.delete(handler); }
  onServerRequest(handler: (request: ServerRequest) => Promise<unknown>) { this.serverRequests.add(handler); return () => this.serverRequests.delete(handler); }
  clear() { this.notifications.clear(); this.serverRequests.clear(); }
  dispatch(message: RpcMessage) {
    if (message.method && message.id === undefined) for (const notify of this.notifications) notify(message.method, message.params);
    else if (message.method && message.id !== undefined) void this.handleServerRequest(message);
    else if (typeof message.id === "number") this.resolve(message);
  }
  private async handleServerRequest(message: RpcMessage) {
    try {
      const handler = [...this.serverRequests].at(-1);
      if (!handler) throw new Error("No handler for Codex server request");
      this.write({ jsonrpc: "2.0", id: message.id!, result: await handler({ method: message.method!, params: message.params }) });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Request rejected";
      this.write({ jsonrpc: "2.0", id: message.id!, error: { code: -32000, message: messageText } });
    }
  }
}
