import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";

type RecordedMessage = { id?: number; method: string };
type Waiter = { method: string; resolve: (message: RecordedMessage) => void };

export function fakeCodexChild() {
  const stdout = new PassThrough();
  const requests: RecordedMessage[] = [];
  const waiters: Waiter[] = [];
  const record = (message: RecordedMessage) => {
    requests.push(message);
    for (const waiter of waiters.filter((item) => item.method === message.method)) waiter.resolve(message);
  };
  const stdin = new Writable({ write(chunk, _encoding, done) { for (const line of String(chunk).split("\n").filter(Boolean)) record(JSON.parse(line) as RecordedMessage); done(); } });
  const child = Object.assign(new EventEmitter(), { pid: 4242, stdin, stdout }) as unknown as ChildProcess;
  const requested = (method: string) => new Promise<RecordedMessage>((resolve) => {
    const seen = requests.find((message) => message.method === method);
    if (seen) resolve(seen);
    else waiters.push({ method, resolve });
  });
  const respond = (id: number | undefined, result: unknown) => { stdout.emit("data", Buffer.from(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`)); };
  const answer = async (method: string, result: unknown) => { respond((await requested(method)).id, result); };
  return { child, requests, requested, respond, answer };
}
