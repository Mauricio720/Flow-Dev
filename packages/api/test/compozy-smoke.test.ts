import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { CompozyTaskSpec, CompozyTaskState } from "../src/application/compozy/compozyGateway";
import { CompozyHttpGateway } from "../src/infra/compozy/compozyHttpGateway";
import { compozyCli, disposableRepository, poll, record, removeGitWorktree, smokeEnabled } from "./compozy-smoke-support";

const PROBE_TIMEOUT_MS = 15 * 60_000;
const TERMINAL_RUN_STATES = ["completed", "failed", "canceled", "needs_attention"];
const gateway = new CompozyHttpGateway();
const suffix = randomUUID().slice(0, 8);
const state: { repository?: Awaited<ReturnType<typeof disposableRepository>>; workspaceId?: string; worktreeId?: string; worktreePath?: string; taskId?: string } = {};

const probeTask: CompozyTaskSpec = {
  identifier: `FD-SMOKE-${suffix}-impl`, title: `Flow Dev smoke probe ${suffix}`,
  description: "Sonda descartável do Flow Dev. Não altere nenhum arquivo e não rode comandos. Conclua o run imediatamente com o resultado `ok`.",
  metadata: { "flow_dev.smoke": "1" }, maxAttempts: 1, requiresApproval: true, autoEnqueueOnReady: true,
  profile: { worker: { agentName: "general" }, review: { agentName: "reviewer" }, worktree: { mode: "none" } },
};

afterAll(async () => {
  if (state.taskId) record("cleanup.cancel_task", await gateway.cancelTask(state.taskId).then(() => "canceled", (error: unknown) => String((error as Error).message)));
  if (state.worktreeId) record("cleanup.worktree", await compozyCli(["worktree", "remove", state.worktreeId, "--workspace", state.workspaceId ?? "", "--force", "--delete-branch", "-o", "json"]));
  if (state.repository && state.worktreePath) record("cleanup.git_worktree", await removeGitWorktree(state.repository.root, state.worktreePath));
  if (state.workspaceId) record("cleanup.workspace", await compozyCli(["workspace", "remove", state.workspaceId, "-o", "json"]));
  await state.repository?.remove();
}, PROBE_TIMEOUT_MS);

describe.runIf(smokeEnabled)("IT-020 real CompozyOS daemon probes", () => {
  it("resolves a disposable workspace and reads worktree files (d)", async () => {
    expect(await gateway.health()).toMatchObject({ reachable: true });
    state.repository = await disposableRepository();
    state.workspaceId = (await gateway.resolveWorkspace(state.repository.root)).workspaceId;
    const worktree = await gateway.createWorktree({ workspaceId: state.workspaceId, name: `fd-smoke-${suffix}`, branch: `flow-dev/smoke-${suffix}`, baseRef: "main" });
    state.worktreeId = worktree.worktreeId;
    state.worktreePath = worktree.path;
    const read = () => gateway.readFile({ workspaceId: state.workspaceId!, worktreeId: worktree.worktreeId, path: "README.md" });
    const readme = await poll(() => read().catch((error: unknown) => ({ error: (error as { detail?: unknown }).detail })), (value) => "content" in value, 120_000);
    const secret = await gateway.readFile({ workspaceId: state.workspaceId, worktreeId: worktree.worktreeId, path: ".env" }).catch((error: unknown) => ({ error: String(error) }));
    record("d.read_file", { worktree, readme, secret });
    expect(readme).toEqual({ content: "smoke probe\n" });
  }, PROBE_TIMEOUT_MS);

  it("holds an approval gated task until approveTask and reuses it by identifier (a)", async () => {
    state.taskId = (await gateway.createTask(state.workspaceId!, probeTask)).taskId;
    expect((await gateway.createTask(state.workspaceId!, probeTask)).taskId).toBe(state.taskId);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    const beforeApproval = await gateway.readTask(state.taskId);
    await gateway.approveTask({ taskId: state.taskId, idempotencyKey: randomUUID() });
    const afterApproval = await poll(() => gateway.readTask(state.taskId!), (task) => task.latestRun !== null, 60_000);
    record("a.approval", { approvalPolicy: "manual", autoEnqueueOnReady: true, beforeApproval, afterApproval });
    expect(beforeApproval.latestRun).toBeNull();
    expect(afterApproval.latestRun).not.toBeNull();
  }, PROBE_TIMEOUT_MS);

  it("observes whether the review profile opens a review after the run (b)", async () => {
    const finished = await poll(() => gateway.readTask(state.taskId!), (task) => TERMINAL_RUN_STATES.includes(task.latestRun?.status ?? ""), 6 * 60_000);
    const reviewed = await poll(() => gateway.readTask(state.taskId!), (task: CompozyTaskState) => task.latestReview !== null, 4 * 60_000);
    const runResult = finished.latestRun ? await gateway.readRunResult(finished.latestRun.runId).catch((error: unknown) => String(error)) : null;
    record("b.review", { finished, reviewed, runResult, reviews: finished.latestRun ? await compozyCli(["task", "review", "list", "--run", finished.latestRun.runId, "-o", "json"]) : null });
  }, PROBE_TIMEOUT_MS);
});
