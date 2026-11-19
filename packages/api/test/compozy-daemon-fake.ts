import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { CompozyHttpGateway } from "../src/infra/compozy/compozyHttpGateway";

export type RecordedRequest = { method: string; path: string; query: URLSearchParams; body: unknown };
export type FakeReply = { status: number; body?: unknown } | "hang";
type Handler = (request: RecordedRequest) => FakeReply;

const LOOPBACK = "127.0.0.1";
const DAEMON_VERSION = "0.7.3";
const TEST_TIMEOUT_MS = 200;

export async function fakeDaemon() {
  const routes = new Map<string, Handler>();
  const requests: RecordedRequest[] = [];
  const server = createServer((request, response) => void handle({ request, response, routes, requests }));
  await new Promise<void>((resolve) => server.listen(0, LOOPBACK, resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://${LOOPBACK}:${port}`;
  routes.set("GET /api/status/identity", () => ({ status: 200, body: { schema_version: "1", daemon: { version: DAEMON_VERSION, http_host: LOOPBACK, http_port: port, pid: 4242 } } }));
  const gateway = (timeoutMs = TEST_TIMEOUT_MS) => new CompozyHttpGateway({ baseUrl: async () => baseUrl, timeoutMs });
  const close = () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); });
  const on = (route: string, handler: Handler) => routes.set(route, handler);
  const calls = (route: string) => requests.filter((request) => `${request.method} ${request.path}` === route);
  return { baseUrl, port, routes, requests, gateway, close, on, calls };
}

async function handle(input: { request: IncomingMessage; response: ServerResponse; routes: Map<string, Handler>; requests: RecordedRequest[] }) {
  const url = new URL(input.request.url ?? "/", `http://${LOOPBACK}`);
  const recorded = { method: input.request.method ?? "GET", path: url.pathname, query: url.searchParams, body: await readBody(input.request) };
  input.requests.push(recorded);
  const reply = input.routes.get(`${recorded.method} ${recorded.path}`)?.(recorded) ?? { status: 404, body: { error: "route not found", code: "not_found" } };
  if (reply === "hang") return;
  input.response.writeHead(reply.status, { "content-type": "application/json" });
  input.response.end(JSON.stringify(reply.body ?? {}));
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : undefined;
}

export function taskPayload(overrides: Record<string, unknown> = {}) {
  return { id: "task_01", identifier: "FD-MEU-APP-12-4f2a9c1e-impl", title: "Implementar: Frete", status: "pending", scope: "workspace", workspace_id: "ws_1", profile_id: "default", profile_name: "Default", created_at: "2026-11-19T22:00:00Z", updated_at: "2026-11-19T22:00:00Z", latest_event_seq: 1, wake_creator: false, created_by: { kind: "human", ref: "operator" }, origin: { kind: "api" }, ...overrides };
}
