import type { ExecutionRequest, ExecutionResult, ReconcileResult } from "../../application/services/task-flow/actionExecutor";
import { failureDetailOf } from "../../application/services/local-execution/localFailureDetail";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";
import type { CompozyControlGateway } from "../../application/software/compozyControlGateway";
import { COMPOZY_PIN } from "../../application/spec/specPins";
import { PinnedCompozyControlGateway } from "../spec/compozy/compozyControlGateway";
import { LoopRunExecutor } from "../spec/compozy/loopRunExecutor";
import type { RunLauncher } from "../spec/compozy/snapshotRunExecutor";
import { boundedRuntimeTransport } from "./boundedRuntimeTransport";

const WORKSPACE_NAME = "flow-local";
const ACTIVE_STATES = ["running", "unknown"];
const START_FAILED = "runtime_failed";

export type LocalRunExecutor = {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  reconcile(request: ExecutionRequest): Promise<ReconcileResult>;
  cancel?(request: ExecutionRequest): Promise<ReconcileResult>;
  answerQuestion(request: ExecutionRequest, input: { interactionId: string; answer: string }): Promise<boolean>;
};

export type LocalLoopDependencies = { launcher: RunLauncher; root: string; prepare?: () => Promise<void>; gatewayFor?: (socketPath: string) => CompozyControlGateway };

const pinnedGateway = (socketPath: string) => new PinnedCompozyControlGateway({ transport: boundedRuntimeTransport(socketPath), declaredOpenApiSha256: COMPOZY_PIN.openApiSha256 });

// The connector reports the Compozy Loop run as the session of the run, and a local checkout stands in for the worktree.
function inCheckout(request: ExecutionRequest): ExecutionRequest {
  const runtime = { ...request.run.runtime, runId: request.run.runtime.sessionId };
  return { ...request, run: { ...request.run, worktreeId: request.snapshot.worktreeId, runtime } };
}

/** Runs a Loop on the per-run CompozyOS daemon started against the linked checkout. */
export class LocalLoopRunExecutor implements LocalRunExecutor {
  constructor(private readonly deps: LocalLoopDependencies) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    await this.deps.prepare?.();
    const result = await this.start(request);
    if (result.kind === "submitted") return { kind: "submitted", runtime: { workspaceId: result.runtime.workspaceId, sessionId: result.runtime.runId, turnId: null } };
    if (result.kind !== "unknown") await this.deps.launcher.stop(request.run.id).catch(() => undefined);
    return result;
  }

  async reconcile(request: ExecutionRequest): Promise<ReconcileResult> {
    const { workspaceId, sessionId } = request.run.runtime;
    if (!workspaceId || !sessionId) return { state: "unknown", code: null };
    const loops = await this.loops(request).catch(() => null);
    if (!loops) return { state: "unknown", code: null };
    return this.settle(request, await loops.reconcile(inCheckout(request)));
  }

  async cancel(request: ExecutionRequest): Promise<ReconcileResult> {
    const loops = await this.loops(request).catch(() => null);
    if (!loops) return { state: "unknown", code: "outcome_unknown" };
    return this.settle(request, await loops.cancel(inCheckout(request)));
  }

  async answerQuestion() {
    return false;
  }

  private async start(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      return await (await this.loops(request)).execute(inCheckout(request));
    } catch (error) {
      if (error instanceof LocalExecutionError) throw error;
      const detail = failureDetailOf(error);
      return { kind: "failed", code: START_FAILED, ...(detail ? { detail } : {}) };
    }
  }

  private async settle(request: ExecutionRequest, result: ReconcileResult): Promise<ReconcileResult> {
    if (ACTIVE_STATES.includes(result.state)) return result;
    try { await this.deps.launcher.stop(request.run.id); } catch { return { state: "unknown", code: null }; }
    return result;
  }

  private async loops(request: ExecutionRequest) {
    const { socketPath } = await this.deps.launcher.start(request);
    const gateway = (this.deps.gatewayFor ?? pinnedGateway)(socketPath);
    return new LoopRunExecutor({ gateway, workspaceOf: () => this.workspace(gateway) });
  }

  private async workspace(gateway: CompozyControlGateway) {
    const registered = await gateway.registerWorkspace?.({ rootDir: this.deps.root, name: WORKSPACE_NAME });
    return registered?.ok ? { workspaceId: registered.value, repositoryId: "", worktreePath: this.deps.root } : null;
  }
}
