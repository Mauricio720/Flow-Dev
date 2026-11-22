import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { IssueContextController } from "../../controllers/issueContextController";
import { buildContextServer } from "./contextMcpServer";

const LOOPBACK_HOST = "127.0.0.1";
const MAX_BODY_BYTES = 64 * 1024;
const PATH_PATTERN = /^\/mcp\/([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i;
const BEARER_PATTERN = /^Bearer ([^\s"']{1,128})$/;

function reject(response: ServerResponse, status: number) {
  response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ error: status }));
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export class ContextMcpEndpoint {
  private server: Server | undefined;
  private port = 0;
  constructor(private readonly controller: IssueContextController) {}

  async start() {
    if (this.server) return;
    const server = createServer((request, response) => void this.handle(request, response).catch(() => reject(response, 500)));
    await new Promise<void>((resolve) => server.listen(0, LOOPBACK_HOST, resolve));
    this.server = server;
    this.port = (server.address() as AddressInfo).port;
    console.info(`[agents] context endpoint listening on ${LOOPBACK_HOST}:${this.port}`);
  }

  async stop() {
    const server = this.server;
    this.server = undefined;
    if (!server) return;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  urlFor(executionId: string) {
    return `http://${LOOPBACK_HOST}:${this.port}/mcp/${executionId}`;
  }

  private async handle(request: IncomingMessage, response: ServerResponse) {
    const executionId = PATH_PATTERN.exec(request.url ?? "")?.[1];
    if (!executionId) return reject(response, 404);
    const capability = BEARER_PATTERN.exec(request.headers.authorization ?? "")?.[1];
    if (!capability) return reject(response, 401);
    if (request.method !== "POST") return reject(response, 405);
    const body = await readBody(request);
    if (!body) return reject(response, 413);
    await this.serve(request, response, { executionId, capability }, body);
  }

  private async serve(request: IncomingMessage, response: ServerResponse, caller: { executionId: string; capability: string }, body: Buffer) {
    let parsed: unknown;
    try { parsed = JSON.parse(body.toString("utf8")); } catch { return reject(response, 400); }
    const server = buildContextServer(this.controller, caller);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    response.on("close", () => void transport.close().then(() => server.close()));
    await server.connect(transport);
    await transport.handleRequest(request, response, parsed);
  }
}
