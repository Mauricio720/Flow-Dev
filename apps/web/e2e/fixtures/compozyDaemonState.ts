import type { IncomingMessage, ServerResponse } from "node:http";
const LOOPBACK = "127.0.0.1";
const VERSION = "0.7.3";
const PROCESS_ID = 4242;
const OK = 200;
const NOT_FOUND = 404;
const UNAVAILABLE = 503;
const NEXT_ATTEMPT = 1;
const REVIEW_ROUND = 1;
const WORKSPACE_ID = "ws_e2e0000000000001";
const PULL_REQUEST_URL = "https://github.com/octocat/Hello-World/pull/1";
const METHODS = { get: "GET", post: "POST", put: "PUT" };
const ROUTES = { identity: "GET /api/status/identity", resolve: "POST /api/workspaces/resolve", tasks: "GET /api/tasks", createTask: "POST /api/tasks" };
const ACTIONS = { profile: "execution-profile", runs: "runs", cancel: "cancel", blocks: "blocks", reviews: "reviews", result: "result" };
const STATES = { ready: "ready", running: "running", queued: "queued", completed: "completed", canceled: "canceled" };
const OUTCOMES = { approved: "approved", rejected: "rejected" };
const COPY = { rejected: "A revisão pediu ajustes antes de concluir.", approved: "Revisão aprovada.", result: "Implementação concluída." };
export const FAKE_WORKSPACE_ID = WORKSPACE_ID;
export type FakeCompozyControl = { setUnavailable: () => void; restore: () => void; advanceToRejected: () => void; advanceToCompleted: () => void };
type Review = { review_id: string; run_id: string; status: string; outcome: string; reason: string; attempt: number; review_round: number; created_at: string };
type Run = { id: string; status: string; attempt: number; queued_at: string; session_id: string; error: string | null };
type Task = { id: string; identifier: string; status: string; run: Run | null; review: Review | null; result: string };
type TaskRequest = { method: string; response: ServerResponse; id: string; action: string };
type RunRequest = { method: string; response: ServerResponse; runId: string; action: string };
async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>;
}
function reply(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(body));
}
export class FakeCompozyHttpApi {
  private unavailable = false;
  private readonly tasks = new Map<string, Task>();
  private readonly ids = new Map<string, string>();
  constructor(private readonly port: number) {}
  control(): FakeCompozyControl { return { setUnavailable: () => { this.unavailable = true; }, restore: () => { this.unavailable = false; }, advanceToRejected: () => this.rejectReview(), advanceToCompleted: () => this.approveReview() }; }
  async route(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? "/", `http://${LOOPBACK}`); const key = `${request.method} ${url.pathname}`;
    const body = await readBody(request);
    if (this.unavailable) return reply(response, UNAVAILABLE, { error: "CompozyOS indisponível", code: "unavailable" });
    if (key === ROUTES.identity) return reply(response, OK, { schema_version: "1", daemon: { version: VERSION, http_host: LOOPBACK, http_port: this.port, pid: PROCESS_ID } });
    if (key === ROUTES.resolve) return this.resolveWorkspace(response, body);
    if (key === ROUTES.tasks) return this.listTasks(response, url.searchParams.get("query"));
    if (key === ROUTES.createTask) return this.createTask(response, body);
    const taskPath = /^\/api\/tasks\/([^/]+)(?:\/(.*))?$/.exec(url.pathname); if (taskPath) return this.taskRoute({ method: request.method ?? METHODS.get, response, id: taskPath[1]!, action: taskPath[2] ?? "" });
    const runPath = /^\/api\/task-runs\/([^/]+)\/(result|reviews)$/.exec(url.pathname); if (runPath) return this.runRoute({ method: request.method ?? METHODS.get, response, runId: runPath[1]!, action: runPath[2]! });
    if (/^\/api\/workspaces\/[^/]+\/sessions\/[^/]+$/.test(url.pathname)) return reply(response, NOT_FOUND, { error: "session not found", code: "not_found" });
    return reply(response, NOT_FOUND, { error: "route not found", code: "not_found" });
  }
  private resolveWorkspace(response: ServerResponse, body: Record<string, unknown>) {
    const root = String(body.path ?? ""); return reply(response, OK, { workspace: { id: WORKSPACE_ID, root_dir: root, name: root.split("/").pop() } });
  }
  private listTasks(response: ServerResponse, query: string | null) {
    const tasks = [...this.tasks.values()].filter((task) => !query || task.identifier.includes(query)).map(({ id, identifier }) => ({ id, identifier })); return reply(response, OK, { tasks });
  }
  private createTask(response: ServerResponse, body: Record<string, unknown>) {
    const identifier = String(body.identifier ?? ""); const existing = this.ids.get(identifier);
    if (existing) return reply(response, OK, { task: { id: existing, identifier } });
    const id = `task_e2e_${this.tasks.size + NEXT_ATTEMPT}`;
    this.tasks.set(id, { id, identifier, status: STATES.ready, run: null, review: null, result: "" }); this.ids.set(identifier, id);
    return reply(response, OK, { task: { id, identifier } });
  }
  private taskRoute({ method, response, id, action }: TaskRequest) {
    if (action === ACTIONS.profile && method === METHODS.put) return reply(response, OK, {});
    const task = this.tasks.get(id);
    if (!task) return reply(response, NOT_FOUND, { error: "task not found", code: "not_found" });
    if (action === ACTIONS.runs && method === METHODS.post) return this.enqueue(response, task);
    if (action === ACTIONS.cancel && method === METHODS.post) return this.cancel(response, task);
    if (action === ACTIONS.runs && method === METHODS.get) return reply(response, OK, { runs: task.run ? [task.run] : [] });
    if (action === ACTIONS.blocks && method === METHODS.get) return reply(response, OK, { blocks: [] });
    if (action === ACTIONS.reviews && method === METHODS.get) return reply(response, OK, { reviews: task.review ? [task.review] : [] });
    if (!action && method === METHODS.get) return reply(response, OK, { task: { task: { id: task.id, status: task.status } } });
    return reply(response, NOT_FOUND, { error: "route not found", code: "not_found" });
  }
  private enqueue(response: ServerResponse, task: Task) {
    const attempt = (task.run?.attempt ?? 0) + NEXT_ATTEMPT;
    const run = { id: `${task.id}_run_${attempt}`, status: STATES.queued, attempt, queued_at: new Date().toISOString(), session_id: "session_e2e", error: null }; task.status = STATES.running; task.run = run;
    return reply(response, OK, { run });
  }
  private cancel(response: ServerResponse, task: Task) {
    task.status = STATES.canceled; if (task.run) task.run.status = STATES.canceled; return reply(response, OK, { task: { id: task.id, status: task.status } });
  }
  private runRoute({ method, response, runId, action }: RunRequest) {
    const task = [...this.tasks.values()].find((candidate) => candidate.run?.id === runId);
    if (!task) return reply(response, NOT_FOUND, { error: "run not found", code: "not_found" });
    if (action === ACTIONS.reviews && method === METHODS.post) return reply(response, OK, { review: { id: `review_${runId}` } });
    if (action === ACTIONS.result && method === METHODS.get) return reply(response, OK, { data_base64: Buffer.from(task.result).toString("base64"), eof: true });
    return reply(response, NOT_FOUND, { error: "route not found", code: "not_found" });
  }
  private rejectReview() {
    for (const task of this.tasks.values()) if (task.run) { task.status = STATES.running; task.run.status = STATES.completed; task.review = this.review(task, OUTCOMES.rejected, COPY.rejected); }
  }
  private approveReview() {
    for (const task of this.tasks.values()) if (task.run) { task.status = STATES.completed; task.run.status = STATES.completed; task.review = this.review(task, OUTCOMES.approved, COPY.approved); task.result = `${COPY.result}\nPR: ${PULL_REQUEST_URL}`; }
  }
  private review(task: Task, outcome: string, reason: string): Review {
    return { review_id: `review_${task.run!.id}`, run_id: task.run!.id, status: STATES.completed, outcome, reason, attempt: task.run!.attempt, review_round: REVIEW_ROUND, created_at: new Date().toISOString() };
  }
}
