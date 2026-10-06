import type { CreateRuntimeSession, RuntimeSession } from "../../../application/spec/specRuntimeGateway";
import { sessionListSchema, sessionSchema, workspaceSchema, workspacesSchema } from "./compozySchemas";
import { callOk, send } from "./compozyCall";
import { SpecRuntimeError } from "./compozyErrors";
import type { CompozyTransport } from "./compozyTransport";

const CREATED_STATUS = 201;
const CONFLICT_STATUS = 409;
const SERVER_ERROR_FLOOR = 500;
const LIST_PAGE_LIMIT = 100;

async function ensureWorkspace(transport: CompozyTransport, input: CreateRuntimeSession) {
  const request = { method: "POST" as const, path: "/api/workspaces", body: { root_dir: input.workspaceRoot, name: input.workspaceName, default_agent: input.agentName } };
  const response = await send(transport, request).catch(() => null);
  if (response?.status === CREATED_STATUS) return parseCreated(response.body);
  if (!response || response.status === CONFLICT_STATUS || response.status >= SERVER_ERROR_FLOOR) return findWorkspace(transport, input.workspaceRoot);
  throw new SpecRuntimeError("runtime_failed");
}

function parseCreated(body: unknown) {
  const parsed = workspaceSchema.safeParse(body);
  if (!parsed.success) throw new SpecRuntimeError("outcome_unknown", true, "workspace registration outcome");
  return parsed.data.workspace.id;
}

async function findWorkspace(transport: CompozyTransport, root: string) {
  const { workspaces } = await callOk(transport, { request: { method: "GET", path: "/api/workspaces" }, schema: workspacesSchema, accepted: [200] });
  const match = workspaces.find((workspace) => workspace.root_dir === root);
  if (!match) throw new SpecRuntimeError("outcome_unknown", true, "workspace conflict without match");
  return match.id;
}

export async function listNamedSessions(transport: CompozyTransport, workspaceId: string, name: string) {
  const matches: string[] = [];
  let cursor: string | undefined;
  do {
    const query = new URLSearchParams({ workspace_id: workspaceId, limit: String(LIST_PAGE_LIMIT), ...(cursor ? { cursor } : {}) });
    const page = await callOk(transport, { request: { method: "GET", path: `/api/sessions?${query}` }, schema: sessionListSchema, accepted: [200] });
    for (const session of page.sessions) if (session.name === name && (!session.workspace_id || session.workspace_id === workspaceId)) matches.push(session.id);
    cursor = page.page.has_more ? page.page.next_cursor : undefined;
  } while (cursor);
  return matches;
}

export async function createSession(transport: CompozyTransport, input: CreateRuntimeSession): Promise<RuntimeSession> {
  const workspaceId = await ensureWorkspace(transport, input);
  const body = { workspace: workspaceId, agent_name: input.agentName, name: input.sessionName };
  const created = await send(transport, { method: "POST", path: "/api/sessions", body }).catch(() => null);
  const parsed = created?.status === 201 ? sessionSchema.safeParse(created.body) : null;
  if (parsed?.success) return { workspaceId, sessionId: parsed.data.session.id, name: input.sessionName };
  return reconcileSession(transport, { workspaceId, input, body, rejected: Boolean(created && created.status < 500 && created.status !== 201) });
}

async function reconcileSession(transport: CompozyTransport, context: { workspaceId: string; input: CreateRuntimeSession; body: unknown; rejected: boolean }): Promise<RuntimeSession> {
  const { workspaceId, input, body, rejected } = context;
  if (rejected) throw new SpecRuntimeError("runtime_failed");
  const matches = await listNamedSessions(transport, workspaceId, input.sessionName);
  if (matches.length === 1) return { workspaceId, sessionId: matches[0]!, name: input.sessionName };
  if (matches.length > 1) throw new SpecRuntimeError("outcome_unknown", true, "ambiguous session catalog");
  const retried = await callOk(transport, { request: { method: "POST", path: "/api/sessions", body }, schema: sessionSchema, accepted: [201] });
  return { workspaceId, sessionId: retried.session.id, name: input.sessionName };
}
