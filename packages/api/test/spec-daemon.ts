import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type DaemonState = {
  version: string;
  permissions: string;
  provider: string;
  workspaces: { id: string; root_dir: string; name: string }[];
  sessions: { id: string; name: string; workspace_id: string; state: string; verified: boolean; stop_reason?: string; pending: Record<string, unknown>[] }[];
  prompts: { message_id: string; idempotency_key: string; session: string; runtime?: Record<string, unknown> }[];
  dropNextCreateResponse: boolean;
  duplicateSessions: number;
  promptStatus: number;
  stopStatus: number;
  stopBody: Record<string, unknown> | null;
  sessionStatus: number;
  approveBody: Record<string, unknown> | null;
  approveStatus: number;
  answerStatus: number;
  answerResolves: boolean;
  requests: string[];
};
export const defaultDaemon = (): DaemonState => ({ version: "0.3.0-beta.29", permissions: "approve-reads", provider: "anthropic", workspaces: [], sessions: [], prompts: [], dropNextCreateResponse: false, duplicateSessions: 0, promptStatus: 202, stopStatus: 202, stopBody: null, sessionStatus: 200, approveBody: null, approveStatus: 200, answerStatus: 200, answerResolves: true, requests: [] });

const json = (response: ServerResponse, status: number, body: unknown) => response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
const readBody = (request: IncomingMessage) => new Promise<Record<string, unknown>>((resolve) => { const chunks: Buffer[] = []; request.on("data", (chunk) => chunks.push(chunk)); request.on("end", () => resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {})); });
const sessionView = (session: DaemonState["sessions"][number]) => ({ id: session.id, name: session.name, workspace_id: session.workspace_id, state: session.state, verified: session.verified, stop_reason: session.stop_reason, pending_interactions: session.pending });

export async function startDaemon(overrides: Partial<DaemonState> = {}) {
  const state = { ...defaultDaemon(), ...overrides };
  const directory = await mkdtemp(join(tmpdir(), "spec-daemon-"));
  const socketPath = join(directory, "daemon.sock");
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://daemon");
    const body = await readBody(request);
    state.requests.push(`${request.method} ${url.pathname}`);
    route(state, { method: request.method ?? "GET", path: url.pathname, query: url.searchParams, body }, response, request);
  });
  await new Promise<void>((resolve) => server.listen(socketPath, resolve));
  return { socketPath, state, close: async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); await rm(directory, { recursive: true, force: true }); } };
}
type Call = { method: string; path: string; query: URLSearchParams; body: Record<string, unknown> };

function route(state: DaemonState, call: Call, response: ServerResponse, request: IncomingMessage) {
  const { method, path, body } = call;
  if (path === "/api/status/identity") return json(response, 200, { daemon: { version: state.version }, schema_version: "1" });
  if (path.startsWith("/api/agents/")) return json(response, 200, { agent: { name: "flow-spec", permissions: state.permissions, provider: state.provider, definition_digest: "digest" } });
  if (path === "/api/workspaces" && method === "GET") return json(response, 200, { workspaces: state.workspaces });
  if (path === "/api/workspaces") return createWorkspace(state, body, response);
  if (path === "/api/sessions" && method === "GET") return json(response, 200, { sessions: state.sessions.filter((session) => session.workspace_id === call.query.get("workspace_id")), page: { has_more: false } });
  if (path === "/api/sessions") return createSession(state, body, response, request);
  return sessionRoute(state, call, response);
}

function createWorkspace(state: DaemonState, body: Record<string, unknown>, response: ServerResponse) {
  const existing = state.workspaces.find((workspace) => workspace.root_dir === body.root_dir);
  if (existing) return json(response, 409, { error: "exists" });
  const workspace = { id: `w${state.workspaces.length + 1}`, root_dir: String(body.root_dir), name: String(body.name ?? "") };
  state.workspaces.push(workspace);
  json(response, 201, { workspace });
}

function createSession(state: DaemonState, body: Record<string, unknown>, response: ServerResponse, request: IncomingMessage) {
  const copies = 1 + state.duplicateSessions;
  const created = Array.from({ length: copies }, (_, index) => ({ id: `s${state.sessions.length + index + 1}`, name: String(body.name), workspace_id: String(body.workspace), state: "active", verified: false, pending: [] }));
  state.sessions.push(...created);
  if (state.dropNextCreateResponse) { state.dropNextCreateResponse = false; request.socket.destroy(); return; }
  json(response, 201, { session: sessionView(created[0]!) });
}

function sessionRoute(state: DaemonState, call: Call, response: ServerResponse) {
  const match = /^\/api\/workspaces\/([^/]+)\/sessions\/([^/]+)(?:\/(.*))?$/.exec(call.path);
  if (!match) return json(response, 404, { error: "not found" });
  const session = state.sessions.find((item) => item.id === match[2]);
  const action = match[3] ?? "";
  if (action === "" && call.method === "GET") return state.sessionStatus === 200 && session ? json(response, 200, { session: sessionView(session) }) : json(response, state.sessionStatus === 200 ? 404 : state.sessionStatus, { error: "gone" });
  if (action === "prompt") return prompt(state, call, response, match[2]!);
  if (action === "stop") return state.stopBody ? json(response, state.stopStatus, state.stopBody) : json(response, state.stopStatus, { session_id: match[2], state: "stopping", status: "stopping", verified: false, escalated: false });
  if (action === "interactions") return json(response, 200, { interactions: session?.pending ?? [] });
  if (action === "approve") return json(response, state.approveStatus, state.approveBody);
  if (action.startsWith("clarifications/")) return answer(state, call, response, session, action.split("/")[1]!);
  if (action === "events") return json(response, 200, { events: [] });
  json(response, 404, { error: "not found" });
}

function prompt(state: DaemonState, call: Call, response: ServerResponse, session: string) {
  state.prompts.push({ message_id: String(call.body.message_id), idempotency_key: String(call.body.idempotency_key), session, runtime: call.body.runtime as Record<string, unknown> | undefined });
  if (state.promptStatus >= 400) return json(response, state.promptStatus, { error: "prompt rejected" });
  json(response, state.promptStatus, { prompt: { message_id: call.body.message_id, idempotency_key: call.body.idempotency_key, status: "queued", delivery: "direct", replayed: false, queue_position: 0, new_turn_id: "turn-1" } });
}

function answer(state: DaemonState, call: Call, response: ServerResponse, session: DaemonState["sessions"][number] | undefined, requestId: string) {
  if (state.answerStatus !== 200) return json(response, state.answerStatus, { error: "queue full" });
  const text = String(call.body.text ?? "Thirty days");
  const record = session?.pending.find((item) => item.provider_request_id === requestId);
  if (record && state.answerResolves) Object.assign(record, { status: "resolved", resolution: text });
  json(response, 200, { choice: 0, fallback: false, text });
}
