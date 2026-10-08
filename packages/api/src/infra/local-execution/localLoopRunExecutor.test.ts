import { describe, expect, it, vi } from "vitest";
import type { ExecutionRequest } from "../../application/services/task-flow/actionExecutor";
import type { CompozyControlGateway, LoopRunStatus } from "../../application/software/compozyControlGateway";
import { controlOk } from "../../application/software/controlErrors";
import { LocalLoopRunExecutor } from "./localLoopRunExecutor";

const ROOT = "/checkout";
const CHOICE = { connectionId: "c1", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: "high" };
const runStatus = (state: string): LoopRunStatus => ({ runId: "looprun-1", state, terminalReason: null, definitionVersion: 0, createdAt: new Date().toISOString(), inputs: {} });

function requestOf(runtime: Partial<ExecutionRequest["run"]["runtime"]> = {}) {
  const snapshot = { kind: "loop", loopName: "implement-tasks", loopVersion: "0", inputs: { slug: "task-1" }, runtimeBindings: { default_runtime: CHOICE }, workspace: { kind: "local" }, worktreeId: "local:link-1", runtimeProviderIds: { c1: "codex" } };
  const run = { id: "run-1", taskId: "task-1", worktreeId: null, createdAt: new Date(), runtime: { workspaceId: null, sessionId: null, turnId: null, runId: null, ...runtime } };
  return { run, snapshot, grants: [] } as unknown as ExecutionRequest;
}

function harness(state = "running") {
  const gateway = {
    registerWorkspace: vi.fn(async () => controlOk("ws-1", "0.3.0")),
    startLoop: vi.fn(async () => controlOk(runStatus("running"), "0.3.0")),
    getLoopRun: vi.fn(async () => controlOk(runStatus(state), "0.3.0")),
    cancelLoopRun: vi.fn(async () => controlOk(runStatus("canceled"), "0.3.0")),
  };
  const launcher = { start: vi.fn(async () => ({ socketPath: "/run/daemon.sock" })), stop: vi.fn(async () => undefined) };
  const prepare = vi.fn(async () => undefined);
  const executor = new LocalLoopRunExecutor({ launcher, root: ROOT, prepare, gatewayFor: () => gateway as unknown as CompozyControlGateway });
  return { executor, gateway, launcher, prepare };
}

describe("local loop run executor", () => {
  it("installs the documents, starts the Loop on the linked checkout and reports its run as the session", async () => {
    const { executor, gateway, prepare } = harness();
    const result = await executor.execute(requestOf());
    expect(result).toEqual({ kind: "submitted", runtime: { workspaceId: "ws-1", sessionId: "looprun-1", turnId: null } });
    expect(prepare).toHaveBeenCalledOnce();
    expect(gateway.registerWorkspace).toHaveBeenCalledWith({ rootDir: ROOT, name: "flow-local" });
    expect(gateway.startLoop).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "ws-1", name: "implement-tasks", worktreeId: null, inputs: { slug: "task-1", default_runtime: { provider: "codex", model: "gpt-5.6-sol", reasoning: "high" } } }));
  });

  it("sends the single worker runtime of a review Loop as a run default instead of an input", async () => {
    const { executor, gateway } = harness();
    const request = requestOf();
    Object.assign(request.snapshot, { loopName: "review-and-fix", inputs: { task_name: "task-1" }, runtimeBindings: { worker: CHOICE } });
    await executor.execute(request);
    expect(gateway.startLoop).toHaveBeenCalledWith(expect.objectContaining({ name: "review-and-fix", inputs: { task_name: "task-1" }, workerRuntime: { provider: "codex", model: "gpt-5.6-sol", reasoning: "high" } }));
  });

  it("follows the Loop run by its session and stops the daemon only when it settles", async () => {
    const running = harness("running");
    expect(await running.executor.reconcile(requestOf({ workspaceId: "ws-1", sessionId: "looprun-1" }))).toEqual({ state: "running", code: null });
    expect(running.gateway.getLoopRun).toHaveBeenCalledWith({ workspaceId: "ws-1", name: "implement-tasks", runId: "looprun-1" });
    expect(running.launcher.stop).not.toHaveBeenCalled();
    const done = harness("done");
    expect(await done.executor.reconcile(requestOf({ workspaceId: "ws-1", sessionId: "looprun-1" }))).toEqual({ state: "succeeded", code: null });
    expect(done.launcher.stop).toHaveBeenCalledWith("run-1");
  });

  it("never starts a second Loop while reconciling a run without a known session", async () => {
    const { executor, gateway } = harness();
    expect(await executor.reconcile(requestOf())).toEqual({ state: "unknown", code: null });
    expect(gateway.startLoop).not.toHaveBeenCalled();
  });

  it("cancels the Loop run and stops the daemon", async () => {
    const { executor, launcher } = harness();
    expect(await executor.cancel(requestOf({ workspaceId: "ws-1", sessionId: "looprun-1" }))).toMatchObject({ state: "canceled" });
    expect(launcher.stop).toHaveBeenCalledWith("run-1");
  });
});
