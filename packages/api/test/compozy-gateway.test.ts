import { afterEach, describe, expect, it } from "vitest";
import type { CompozyTaskSpec } from "../src/application/compozy/compozyGateway";
import { EXECUTION_REVIEW_BRIEFING } from "../src/infra/compozy/executionBriefing";
import { fakeDaemon, taskPayload } from "./compozy-daemon-fake";

type Daemon = Awaited<ReturnType<typeof fakeDaemon>>;
let daemon: Daemon | undefined;
afterEach(async () => { await daemon?.close(); daemon = undefined; });

const spec: CompozyTaskSpec = {
  identifier: "FD-MEU-APP-12-4f2a9c1e-impl", title: "Implementar: Frete", description: "Briefing", maxAttempts: 3, requiresApproval: true, autoEnqueueOnReady: true,
  metadata: { "flow_dev.task_id": "4f2a9c1e", "flow_dev.route": "direct_execution" },
  profile: { worker: { agentName: "code_implementer" }, review: { agentName: "reviewer" }, worktree: { mode: "per_run" } },
};

async function daemonWithTasks(existing: unknown[]) {
  daemon = await fakeDaemon();
  daemon.on("GET /api/tasks", () => ({ status: 200, body: { tasks: existing, page: { has_more: false, limit: 50, total: existing.length }, facets: { owners: [], statuses: [] } } }));
  daemon.on("POST /api/tasks", () => ({ status: 201, body: { task: taskPayload({ id: "task_new" }) } }));
  daemon.on("PUT /api/tasks/task_new/execution-profile", () => ({ status: 200, body: {} }));
  daemon.on("PUT /api/tasks/task_old/execution-profile", () => ({ status: 200, body: {} }));
  return daemon;
}

describe("CompozyHttpGateway against a fake daemon", () => {
  it("IT-017 creates the task with the OpenAPI field names and applies the profile", async () => {
    const fake = await daemonWithTasks([]);
    await expect(fake.gateway().createTask("ws_1", spec)).resolves.toEqual({ taskId: "task_new" });
    expect(fake.calls("GET /api/tasks")[0]?.query.get("query")).toBe(spec.identifier);
    expect(fake.calls("POST /api/tasks")[0]?.body).toEqual({ scope: "workspace", workspace: "ws_1", identifier: spec.identifier, title: spec.title, description: "Briefing", metadata: spec.metadata, max_attempts: 3, approval_policy: "manual", auto_enqueue_on_ready: true, wake_creator: false });
    expect(fake.calls("PUT /api/tasks/task_new/execution-profile")[0]?.body).toMatchObject({ task_id: "task_new", worker: { mode: "select", agent_name: "code_implementer" }, review: { agent_name: "reviewer" }, worktree: { mode: "per_run" } });
  });

  it("IT-017 requests review with the execution verdict briefing", async () => {
    const fake = await daemonWithTasks([]);
    fake.on("POST /api/task-runs/run_1/reviews", () => ({ status: 201, body: { review: {} } }));
    await fake.gateway().requestReview({ taskId: "task_new", runId: "run_1" });
    expect(fake.calls("POST /api/task-runs/run_1/reviews")[0]?.body).toMatchObject({
      run_id: "run_1",
      task_id: "task_new",
      policy: "always",
      reason: `Revisão pedida pelo Flow Dev\n\n${EXECUTION_REVIEW_BRIEFING}`,
    });
  });

  it("IT-018 reuses a task found by exact identifier instead of creating another", async () => {
    const fake = await daemonWithTasks([taskPayload({ id: "task_similar", identifier: `${spec.identifier}-old` }), taskPayload({ id: "task_old" })]);
    await expect(fake.gateway().createTask("ws_1", spec)).resolves.toEqual({ taskId: "task_old" });
    expect(fake.calls("POST /api/tasks")).toHaveLength(0);
    expect(fake.calls("PUT /api/tasks/task_old/execution-profile")).toHaveLength(1);
  });

  it("resolves existing spec worktrees and reads files from the selected tree", async () => {
    const fake = await daemonWithTasks([]);
    fake.on("GET /api/workspaces/ws_1/worktrees", () => ({ status: 200, body: { worktrees: [{ id: "worktree_1", name: "fd-spec", branch: "flow-dev/spec", path: "/tmp/spec" }], discovered: [], repo: { git_available: true, git_backed: true } } }));
    fake.on("GET /api/workspaces/ws_1/files/entries", () => ({ status: 200, body: { entries: [{ path: ".compozy/tasks/fd-spec/_spec.md", kind: "file" }], path: ".compozy/tasks/fd-spec", root: {}, truncated: false } }));
    fake.on("GET /api/workspaces/ws_1/files/content", () => ({ status: 200, body: { text: "# Spec", sensitive: false } }));
    const gateway = fake.gateway();
    await expect(gateway.findWorktree({ workspaceId: "ws_1", name: "fd-spec" })).resolves.toMatchObject({ worktreeId: "worktree_1", branch: "flow-dev/spec" });
    await expect(gateway.listFileEntries({ workspaceId: "ws_1", worktreeId: "worktree_1", path: ".compozy/tasks/fd-spec" })).resolves.toEqual([{ path: ".compozy/tasks/fd-spec/_spec.md", kind: "file" }]);
    await expect(gateway.readFile({ workspaceId: "ws_1", worktreeId: "worktree_1", path: ".compozy/tasks/fd-spec/_spec.md" })).resolves.toEqual({ content: "# Spec" });
    expect(fake.calls("GET /api/workspaces/ws_1/files/entries")[0]?.query.get("worktree_id")).toBe("worktree_1");
  });
});
