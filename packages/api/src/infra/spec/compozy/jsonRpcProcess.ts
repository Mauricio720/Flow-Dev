import { spawn, type ChildProcessByStdio } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };
type Notification = { method: string; params: Record<string, unknown> };

const REQUEST_TIMEOUT_MS = 15_000;

export class JsonRpcProcess {
  private readonly child: ChildProcessByStdio<Writable, Readable, null>;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  onNotification: (notification: Notification) => void = () => undefined;

  constructor(command: string, options: { args: string[]; env: NodeJS.ProcessEnv }) {
    this.child = spawn(command, options.args, { env: options.env, stdio: ["pipe", "pipe", "ignore"] });
    createInterface({ input: this.child.stdout }).on("line", (line) => this.receive(line));
    this.child.on("error", (error) => this.failAll(error));
    this.child.on("exit", () => this.failAll(new Error("app_server_exited")));
  }

  request<T>(method: string, params: unknown): Promise<T> {
    const id = this.nextId++;
    const response = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("app_server_timeout")), REQUEST_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value as T); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
    });
    this.child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    return response;
  }

  notify(method: string, params?: unknown) {
    this.child.stdin.write(`${JSON.stringify({ method, params })}\n`);
  }

  close() {
    this.child.kill();
  }

  private receive(line: string) {
    let message: { id?: number; result?: unknown; error?: unknown; method?: string; params?: Record<string, unknown> };
    try { message = JSON.parse(line); } catch { return; }
    if (message.method && message.id === undefined) return this.onNotification({ method: message.method, params: message.params ?? {} });
    const entry = message.id === undefined ? undefined : this.pending.get(message.id);
    if (!entry || message.id === undefined) return;
    this.pending.delete(message.id);
    if (message.error) entry.reject(new Error("app_server_error"));
    else entry.resolve(message.result);
  }

  private failAll(error: Error) {
    for (const entry of this.pending.values()) entry.reject(error);
    this.pending.clear();
  }
}
