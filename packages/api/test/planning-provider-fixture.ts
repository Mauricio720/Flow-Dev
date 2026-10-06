import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { DevControlPlanningGateway } from "../src/infra/planning/devControlPlanningGateway";
import { DrizzleTaskPlanningWorkerDao } from "../src/infra/database/dao/tasks/drizzleTaskPlanningWorkerDao";
import { TaskPlanningWorkerController } from "../src/controllers/taskPlanningWorkerController";
import { sessions } from "../src/infra/database/schema";
import type { PlanningSetup } from "./planning-support";

export const SERVICE_KEY = "service-key-sentinel";
export const ASSESSMENT = { recommendedRoute: "tech_spec", complexity: "medium", summary: "Resumo da análise", reasons: ["Altera contrato"], uncertainties: ["Falta contexto"] };
export const DECISION = { route: "TECH_SPEC", complexity: "MEDIUM", summary: "Resumo da análise", reasons: [{ code: "CONTRACT_CHANGE", label: "Altera contrato", description: null, sourceIds: ["issue"] }], uncertainties: [{ question: "Falta contexto", blocking: false }], recommendedNextStep: { type: "TECH_SPEC", label: "Criar Tech Spec" } };
export type ProviderRequest = { path: string; headers: IncomingMessage["headers"]; body: Record<string, unknown> };
type Handler = (request: ProviderRequest, response: ServerResponse, index: number) => void | Promise<void>;

export async function providerFixture(handler: Handler = respondValid) {
  const requests: ProviderRequest[] = [];
  const server = createServer(async (incoming, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) chunks.push(chunk as Buffer);
    const request = { path: incoming.url ?? "", headers: incoming.headers, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown> };
    requests.push(request);
    await handler(request, response, requests.length - 1);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); });
  return { url, requests, close };
}

export function respondValid(request: ProviderRequest, response: ServerResponse, overrides: Record<string, unknown> = {}) {
  const { operationId, executionId, issueRevisionId } = request.body;
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ protocolVersion: 1, operationId, executionId, issueRevisionId, reviewStatus: "pending_review", result: DECISION, activity: [], ...overrides }));
}

export function respondStatus(status: number, headers: Record<string, string> = {}, body = "sentinel failure body") {
  return (_request: ProviderRequest, response: ServerResponse) => { response.writeHead(status, headers); response.end(body); };
}

export function plannerFor(setup: PlanningSetup, baseUrl: string | undefined, options: { clock?: () => Date; workerId?: string; timeoutMs?: number } = {}) {
  const clock = options.clock ?? (() => new Date());
  const dao = new DrizzleTaskPlanningWorkerDao(setup.database, clock);
  const gateway = new DevControlPlanningGateway(baseUrl, baseUrl ? SERVICE_KEY : undefined, fetch, options.timeoutMs);
  const worker = new TaskPlanningWorkerController(dao, setup.repositoryAccess, gateway, options.workerId ?? crypto.randomUUID(), clock);
  return { dao, worker };
}

export async function keepSessionAlive(setup: PlanningSetup) {
  await setup.database.update(sessions).set({ expiresAt: new Date(Date.now() + 86_400_000) });
}

export function movableClock() {
  let current = Date.now();
  return { now: () => new Date(current), advance: (milliseconds: number) => { current += milliseconds; } };
}
