import { describe, expect, it } from "vitest";
import { COMPOZY_PIN } from "../../../application/spec/specPins";
import { PinnedCompozyControlGateway } from "./compozyControlGateway";
import type { CompozyRequest, CompozyTransport } from "./compozyTransport";
import { toDefinition } from "./compozyLoops";

const IDENTITY = { status: 200, body: { schema_version: "2026-07-16", daemon: { version: COMPOZY_PIN.version } } };

function gatewayWith(routes: Record<string, { status: number; body: unknown }>) {
  const calls: CompozyRequest[] = [];
  const transport: CompozyTransport = async (request) => {
    calls.push(request);
    if (request.path === "/api/status/identity") return IDENTITY;
    return routes[`${request.method} ${request.path}`] ?? { status: 404, body: { error: "not found" } };
  };
  return { gateway: new PinnedCompozyControlGateway({ transport, declaredOpenApiSha256: COMPOZY_PIN.openApiSha256 }), calls };
}

const WORKTREE = { id: "wt-1", name: "feature", state: "ready", workspace_id: "ws-1", path: "/repo/worktrees/feature", dirty: false, branch: "feature", agent_activity: "idle" };
const SUMMARY = { name: "implement-tasks", version: 3, source: "marketplace", description: "d" };
const INPUTS = {
  slug: { type: "string", required: true },
  mode: { type: "string", enum: ["per-task", "orchestrated"], default: "per-task" },
  backend_runtime: { type: "runtime", default: {} },
  frontend_runtime: { type: "runtime", default: {} },
};
const RUN = { id: "run-1", status: "running", definition_version: 3, created_at: "2026-10-06T12:00:00Z", inputs: { slug: "x" } };

describe("pinned provider probe contract", () => {
  it("reads auth_status.state from the pinned response and maps the unconfigured 422 to runtime_incompatible", async () => {
    const ok = gatewayWith({ "POST /api/providers/codex/auth/probe": { status: 200, body: { provider: "codex", auth_status: { state: "authenticated", mode: "native_cli", env_policy: "filtered", home_policy: "operator", login: { configured: true, presence: "present" } } } } });
    expect(await ok.gateway.probeProvider("codex")).toMatchObject({ ok: true, value: { authenticated: true } });
    const needsLogin = gatewayWith({ "POST /api/providers/codex/auth/probe": { status: 200, body: { provider: "codex", auth_status: { state: "needs_login" } } } });
    expect(await needsLogin.gateway.probeProvider("codex")).toMatchObject({ ok: true, value: { authenticated: false } });
    const unconfigured = gatewayWith({ "POST /api/providers/codex/auth/probe": { status: 422, body: { error: "provider auth_status_command is required for remote probe" } } });
    expect(await unconfigured.gateway.probeProvider("codex")).toMatchObject({ ok: false, code: "runtime_incompatible" });
  });
});

describe("pinned worktree contract", () => {
  it("lists, inspects and creates worktrees under their workspace with the exact state", async () => {
    const { gateway, calls } = gatewayWith({
      "GET /api/workspaces/ws-1/worktrees": { status: 200, body: { worktrees: [WORKTREE, { ...WORKTREE, id: "wt-2", state: "pending", dirty: null }], discovered: [], repo: { git_available: true, git_backed: true } } },
      "GET /api/workspaces/ws-1/worktrees/wt-1": { status: 200, body: { worktree: { ...WORKTREE, dirty: null }, status: { dirty_files: 3 }, bindings: { agent_activity: "idle" } } },
      "POST /api/workspaces/ws-1/worktrees": { status: 202, body: { worktree: { ...WORKTREE, id: "wt-new", name: "feature-x", state: "pending" } } },
    });
    expect(await gateway.listWorktrees("ws-1")).toMatchObject({ ok: true, value: [{ id: "wt-1", state: "ready", workspaceId: "ws-1", path: "/repo/worktrees/feature", dirty: false }, { id: "wt-2", state: "pending", dirty: false }] });
    expect(await gateway.getWorktree("ws-1", "wt-1")).toMatchObject({ ok: true, value: { dirty: true } });
    expect(await gateway.createWorktree({ workspaceId: "ws-1", name: "feature-x", requestId: "req-1" })).toMatchObject({ ok: true, value: { id: "wt-new", state: "pending" } });
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({ name: "feature-x" });
  });

  it("makes creation idempotent by name when the daemon answers 409 and rejects malformed rows", async () => {
    const taken = gatewayWith({
      "POST /api/workspaces/ws-1/worktrees": { status: 409, body: { error: "worktree_name_taken" } },
      "GET /api/workspaces/ws-1/worktrees": { status: 200, body: { worktrees: [{ ...WORKTREE, name: "feature-x", id: "wt-x" }], discovered: [], repo: { git_available: true, git_backed: true } } },
    });
    expect(await taken.gateway.createWorktree({ workspaceId: "ws-1", name: "feature-x", requestId: "r" })).toMatchObject({ ok: true, value: { id: "wt-x" } });
    const broken = gatewayWith({ "GET /api/workspaces/ws-1/worktrees": { status: 200, body: { worktrees: [{ id: "x" }] } } });
    expect(await broken.gateway.listWorktrees("ws-1")).toMatchObject({ ok: false, code: "runtime_incompatible" });
    const down = gatewayWith({ "GET /api/workspaces/ws-1/worktrees": { status: 503, body: "boom" } });
    expect(await down.gateway.listWorktrees("ws-1")).toMatchObject({ ok: false, code: "service_unavailable" });
  });
});

describe("pinned loop contract", () => {
  it("projects declared inputs, enums and runtime roles from the definition", async () => {
    const { gateway } = gatewayWith({
      "GET /api/workspaces/ws-1/loops": { status: 200, body: { loops: [SUMMARY], page: { has_more: false, limit: 50, total: 1 }, facets: {} } },
      "GET /api/workspaces/ws-1/loops/implement-tasks": { status: 200, body: { loop: { ...SUMMARY, definition: { inputs: INPUTS } } } },
    });
    const inspected = await gateway.inspectLoop("ws-1", "implement-tasks");
    expect(inspected).toMatchObject({ ok: true, value: { version: "3", runtimeRoles: ["backend_runtime", "frontend_runtime"], inputs: [{ name: "slug", kind: "string", required: true, hasDefault: false, enumValues: null }, { name: "mode", enumValues: ["per-task", "orchestrated"], hasDefault: true }] } });
    expect(await gateway.listLoops("ws-1")).toMatchObject({ ok: true, value: [{ name: "implement-tasks", runtimeRoles: ["backend_runtime", "frontend_runtime"] }] });
  });

  it("offers one worker runtime for a Loop without runtime inputs and sends it as the run's default runtime", async () => {
    const definition = toDefinition({ name: "review-and-fix", version: 0, source: "marketplace", description: "Review", inputs: { task_name: { type: "string", required: true } } });
    expect(definition.runtimeRoles).toEqual(["worker"]);
    const { gateway, calls } = gatewayWith({ "POST /api/workspaces/ws-1/loops/review-and-fix/run": { status: 201, body: { run: RUN } } });
    const workerRuntime = { provider: "codex", model: "gpt-5.6-sol", reasoning: "high" };
    await gateway.startLoop({ workspaceId: "ws-1", name: "review-and-fix", version: "0", inputs: { task_name: "x" }, requestId: "r", workerRuntime });
    expect(calls.find((call) => call.path.endsWith("/run"))?.body).toEqual({ inputs: { task_name: "x" }, config_overrides: { runtime_defaults: { worker: workerRuntime } } });
  });

  it("starts in a worktree environment, reads status from loop-runs, lists live runs and cancels authoritatively", async () => {
    const { gateway, calls } = gatewayWith({
      "POST /api/workspaces/ws-1/loops/implement-tasks/run": { status: 201, body: { run: RUN } },
      "GET /api/workspaces/ws-1/loop-runs/run-1": { status: 200, body: { run: { ...RUN, status: "canceled" } } },
      "POST /api/workspaces/ws-1/loop-runs/run-1/cancel": { status: 200, body: { ok: true, run_id: "run-1", status: "canceled" } },
      "GET /api/workspaces/ws-1/loop-runs?loop=implement-tasks&live=true&limit=50": { status: 200, body: { runs: [RUN], aggregates: {} } },
    });
    const inputs = { slug: "x", backend_runtime: { provider: "codex-ab12cd34ef56", model: "gpt-5.6-sol", reasoning: "high" } };
    const started = await gateway.startLoop({ workspaceId: "ws-1", name: "implement-tasks", version: "3", inputs, requestId: "r", worktreeId: "wt-1" });
    expect(started).toMatchObject({ ok: true, value: { runId: "run-1", state: "running", definitionVersion: 3 } });
    expect(calls.find((call) => call.path.endsWith("/run"))?.body).toEqual({ inputs, config_overrides: { environment: { mode: "worktree", worktree_ref: "wt-1" } } });
    const ref = { workspaceId: "ws-1", name: "implement-tasks", runId: "run-1" };
    expect(await gateway.getLoopRun(ref)).toMatchObject({ ok: true, value: { state: "canceled" } });
    expect(await gateway.cancelLoopRun(ref)).toMatchObject({ ok: true, value: { state: "canceled" } });
    expect(await gateway.listLoopRuns({ workspaceId: "ws-1", name: "implement-tasks" })).toMatchObject({ ok: true, value: [{ runId: "run-1", inputs: { slug: "x" } }] });
  });

  it("fails closed on release drift for Loop and worktree calls", async () => {
    const transport: CompozyTransport = async () => ({ status: 200, body: { schema_version: "x", daemon: { version: "0.3.0-beta.30" } } });
    const gateway = new PinnedCompozyControlGateway({ transport, declaredOpenApiSha256: COMPOZY_PIN.openApiSha256 });
    expect(await gateway.startLoop({ workspaceId: "ws-1", name: "x", version: "1", inputs: {}, requestId: "r" })).toMatchObject({ ok: false, code: "runtime_incompatible" });
    expect(await gateway.createWorktree({ workspaceId: "ws-1", name: "x", requestId: "r" })).toMatchObject({ ok: false, code: "runtime_incompatible" });
  });
});

describe("pinned provider overlay contract", () => {
  it("provisions a native_cli overlay with a status command so the auth probe can classify it", async () => {
    const { gateway, calls } = gatewayWith({ "PUT /api/settings/providers/codex-ab12cd34ef56": { status: 200, body: {} } });
    const result = await gateway.provisionProviderOverlay({ providerId: "codex-ab12cd34ef56", providerKind: "codex", label: "Codex principal", homePath: "/home/x/it's" });
    expect(result.ok).toBe(true);
    const settings = (calls.find((call) => call.method === "PUT")?.body as { settings: Record<string, string> }).settings;
    expect(settings).toMatchObject({ runtime_provider: "codex", auth_mode: "native_cli", home_policy: "operator", env_policy: "filtered" });
    expect(settings.auth_status_command).toBe("env CODEX_HOME='/home/x/it'\\''s' codex login status -c cli_auth_credentials_store=file");
    expect(settings.command).toContain("@agentclientprotocol/codex-acp");
  });
});
