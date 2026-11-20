import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const LOOPBACK = "127.0.0.1";
const DAEMON_VERSION = "0.7.3";
const DAEMON_PID = 4242;
const OK = 200;
const NOT_FOUND = 404;
const IDENTITY_ROUTE = "GET /api/status/identity";
const RESOLVE_ROUTE = "POST /api/workspaces/resolve";

export const FAKE_WORKSPACE_ID = "ws_e2e0000000000001";

function reply(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readPath(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as { path?: string };
  return body.path ?? "";
}

async function route(request: IncomingMessage, response: ServerResponse, port: number) {
  const key = `${request.method} ${new URL(request.url ?? "/", `http://${LOOPBACK}`).pathname}`;
  if (key === IDENTITY_ROUTE) return reply(response, OK, { schema_version: "1", daemon: { version: DAEMON_VERSION, http_host: LOOPBACK, http_port: port, pid: DAEMON_PID } });
  if (key !== RESOLVE_ROUTE) return reply(response, NOT_FOUND, { error: "route not found", code: "not_found" });
  const root = await readPath(request);
  reply(response, OK, { workspace: { id: FAKE_WORKSPACE_ID, root_dir: root, name: root.split("/").pop() } });
}

export async function startFakeCompozy(baseUrl: string) {
  const port = Number(new URL(baseUrl).port);
  const server = createServer((request, response) => void route(request, response, port));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, LOOPBACK, resolve);
  });
  return () => new Promise<void>((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
}
