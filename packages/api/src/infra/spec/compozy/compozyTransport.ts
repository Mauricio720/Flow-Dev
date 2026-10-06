import { request } from "node:http";

export type CompozyRequest = { method: "GET" | "POST"; path: string; body?: unknown; headers?: Record<string, string> };
export type CompozyResponse = { status: number; body: unknown };
export type CompozyTransport = (input: CompozyRequest) => Promise<CompozyResponse>;

const CONTROL_TIMEOUT_MS = 10_000;

export class CompozyTransportError extends Error {
  constructor(readonly kind: "timeout" | "connection", message: string) {
    super(message);
    this.name = "CompozyTransportError";
  }
}

export function unixSocketTransport(socketPath: string, timeoutMs = CONTROL_TIMEOUT_MS): CompozyTransport {
  return (input) => new Promise((resolve, reject) => {
    const payload = input.body === undefined ? undefined : JSON.stringify(input.body);
    const headers = { accept: "application/json", ...(payload ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(payload)) } : {}), ...input.headers };
    const outgoing = request({ socketPath, path: input.path, method: input.method, headers, timeout: timeoutMs }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("error", (error) => reject(new CompozyTransportError("connection", error.message)));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body: parseBody(Buffer.concat(chunks).toString("utf8")) }));
    });
    outgoing.on("timeout", () => outgoing.destroy(new CompozyTransportError("timeout", "runtime control request timed out")));
    outgoing.on("error", (error) => reject(error instanceof CompozyTransportError ? error : new CompozyTransportError("connection", error.message)));
    outgoing.end(payload);
  });
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}
