import type { ChildProcess } from "node:child_process";
import { CodexRpcFrames, type RpcMessage } from "./codexRpcFrames";
import { CodexRpcDispatch, type ServerRequest } from "./codexRpcDispatch";

export type CodexRpc = {
  request<T>(method: string, params?: unknown): Promise<T>;
  notify(method: string, params?: unknown): void;
  onNotification(handler: (method: string, params: unknown) => void): () => void;
  onServerRequest(handler: (request: ServerRequest) => Promise<unknown>): () => void;
  close(): void;
};

export class CodexRpcClient implements CodexRpc {
  private readonly frames = new CodexRpcFrames();
  private readonly pending = new Map<number, { method: string; resolve(value: unknown): void; reject(error: Error): void }>();
  private readonly dispatch = new CodexRpcDispatch((message) => this.write(message), (message) => this.resolve(message));
  private nextId = 0;
  private closed = false;

  constructor(private readonly process: ChildProcess) {
    process.stdout?.on("data", (chunk: Buffer) => this.read(chunk));
    process.stdout?.on("end", () => this.eof());
    process.on("error", (error) => this.failAll(error));
    process.on("exit", (code, signal) => this.failAll(new Error(`Codex app-server exited (${signal ?? code})`)));
  }
  request<T>(method: string, params: unknown = {}): Promise<T> {
    if (this.closed || !this.process.stdin) return Promise.reject(new Error(`Codex RPC ${method} unavailable: process is closed`));
    const id = ++this.nextId;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { method, resolve: (value) => resolve(value as T), reject });
      this.process.stdin!.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`, (error) => { if (error) this.reject(id, error); });
    });
  }
  notify(method: string, params: unknown = {}) { this.write({ jsonrpc: "2.0", method, params }); }
  onNotification(handler: (method: string, params: unknown) => void) { return this.dispatch.onNotification(handler); }
  onServerRequest(handler: (request: ServerRequest) => Promise<unknown>) { return this.dispatch.onServerRequest(handler); }
  close() { this.closed = true; this.failAll(new Error("Codex app-server client closed")); this.dispatch.clear(); }
  private read(chunk: Buffer) {
    try { for (const message of this.frames.push(chunk)) this.dispatch.dispatch(message); }
    catch (error) { this.failAll(error instanceof Error ? error : new Error("Invalid Codex RPC frame")); }
  }
  private write(message: RpcMessage) { this.process.stdin?.write(`${JSON.stringify(message)}\n`); }
  private resolve(message: RpcMessage) {
    const pending = this.pending.get(message.id as number);
    if (!pending) return;
    this.pending.delete(message.id as number);
    if (message.error) pending.reject(new Error(`Codex RPC ${pending.method}: ${message.error.message}`));
    else pending.resolve(message.result);
  }
  private reject(id: number, error: Error) {
    const pending = this.pending.get(id);
    if (pending) pending.reject(new Error(`Codex RPC ${pending.method}: ${error.message}`));
    this.pending.delete(id);
  }
  private eof() {
    try { this.frames.finish(); } catch (error) { this.failAll(error instanceof Error ? error : new Error("Incomplete Codex RPC frame")); return; }
    this.failAll(new Error("Codex app-server closed the JSON-RPC stream"));
  }
  private failAll(error: Error) {
    for (const pending of this.pending.values()) pending.reject(new Error(`Codex RPC ${pending.method}: ${error.message}`));
    this.pending.clear();
  }
}
