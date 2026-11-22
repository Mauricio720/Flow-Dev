import { afterEach, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { DrizzleIssueContextDao } from "../src/infra/database/dao/tasks/drizzleIssueContextDao";
import { DrizzleWorkerOperationDao } from "../src/infra/database/dao/tasks/drizzleTaskOperationDao";
import { IssueContextController } from "../src/controllers/issueContextController";
import { ContextMcpEndpoint } from "../src/infra/agents/contextMcpEndpoint";
import { closeTaskFixture, taskFixture } from "./task-api-support";

const endpoints: ContextMcpEndpoint[] = [];
const clients: Client[] = [];
export function registerContextMcpCleanup() {
  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close()));
    await Promise.all(endpoints.splice(0).map((endpoint) => endpoint.stop()));
    vi.restoreAllMocks();
    await closeTaskFixture();
  });
}

function scopedGateway() {
  const evidence = { type: "project-file" as const, path: "src/cart.ts", commitSha: "a".repeat(40), fromLine: 8, toLine: 12, issueId: null, issueNumber: null, url: null, sourceHash: "b".repeat(64), excerpt: "total" };
  return { pinCommit: vi.fn(async () => "a".repeat(40)), execute: vi.fn(async () => ({ status: "done" as const, data: { path: "src/cart.ts" }, evidence: [evidence] })) };
}

export async function setup() {
  const world = await taskFixture();
  await world.caller.start({ projectId: world.project.id, requestKey: "00000000-0000-4000-8000-0000000000a1", message: "Corrigir total" });
  const claim = await new DrizzleWorkerOperationDao(world.database).claim("worker-1");
  const dao = new DrizzleIssueContextDao(world.database);
  const gateway = scopedGateway();
  const controller = new IssueContextController(dao, world.repositoryAccess, gateway);
  const handle = vi.spyOn(controller, "handle");
  const endpoint = new ContextMcpEndpoint(controller);
  await endpoint.start();
  endpoints.push(endpoint);
  const connect = async (capability: string) => {
    const client = new Client({ name: "test", version: "1" });
    const transport = new StreamableHTTPClientTransport(new URL(endpoint.urlFor(claim!.executionId)), { requestInit: { headers: { Authorization: `Bearer ${capability}` } } });
    await client.connect(transport);
    clients.push(client);
    return client;
  };
  return { world, claim: claim!, dao, gateway, handle, endpoint, connect };
}

export const search = { name: "searchProject", arguments: { query: "cart" } };
