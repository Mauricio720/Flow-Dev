import { createHash } from "node:crypto";
import type { ActionExecutor, ExecutionRequest, ExecutionResult, ReconcileResult } from "../../../application/services/task-flow/actionExecutor";
import type { ActionSnapshot, LoopFlowAction, RuntimeChoice } from "../../../application/services/task-flow/flowContracts";
import { WorkerReconciler } from "../../../application/services/task-flow/workerReconciler";
import { DEFAULT_RUNTIME_ROLE, type CompozyControlGateway } from "../../../application/software/compozyControlGateway";
import type { ControlErrorCode } from "../../../application/software/controlErrors";
import type { ControlWorkspace } from "../../../application/services/task-flow/controlWorkspace";
import { loopActivityUpdate } from "./loopActivityCursor";

export type LoopExecutorDependencies = { gateway: CompozyControlGateway; workspaceOf: (request: ExecutionRequest) => Promise<ControlWorkspace | null>; beforeStart?: (request: ExecutionRequest) => Promise<void> };

const BLOCKING_CODES: ControlErrorCode[] = ["loop_version_changed", "auth_required", "runtime_incompatible", "model_unavailable"];
const UNCERTAIN_CODES: ControlErrorCode[] = ["outcome_unknown", "service_unavailable"];

export function runtimeValue(choice: RuntimeChoice, providerIds: Record<string, string>) {
  const provider = providerIds[choice.connectionId] ?? choice.providerId;
  return { provider, model: choice.modelId, ...(choice.reasoningEffort ? { reasoning: choice.reasoningEffort } : {}) };
}

export function loopInputs(snapshot: ActionSnapshot & LoopFlowAction) {
  const declared = Object.entries(snapshot.runtimeBindings).filter(([role]) => role !== DEFAULT_RUNTIME_ROLE);
  const runtimes = Object.fromEntries(declared.map(([role, choice]) => [role, runtimeValue(choice, snapshot.runtimeProviderIds)]));
  return { ...snapshot.inputs, ...runtimes };
}

export function workerRuntime(snapshot: ActionSnapshot & LoopFlowAction) {
  const choice = snapshot.runtimeBindings[DEFAULT_RUNTIME_ROLE];
  return choice ? runtimeValue(choice, snapshot.runtimeProviderIds) : null;
}

const requestIdFor = (runId: string) => createHash("sha256").update(`loop:${runId}`).digest("hex").slice(0, 32);

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([first], [second]) => first.localeCompare(second)).map(([key, entry]) => [key, sortKeys(entry)]));
}

export class LoopRunExecutor implements ActionExecutor {
  private readonly reconciler = new WorkerReconciler();

  constructor(private readonly deps: LoopExecutorDependencies) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const started = await this.start(request);
    if (started.ok) return { kind: "submitted", runtime: { workspaceId: started.workspaceId, runId: started.runId } };
    if (BLOCKING_CODES.includes(started.code)) return { kind: "blocked", code: started.code };
    return UNCERTAIN_CODES.includes(started.code) ? { kind: "unknown" } : { kind: "failed", code: started.code };
  }

  async reconcile(request: ExecutionRequest): Promise<ReconcileResult> {
    const { workspaceId, runId } = request.run.runtime;
    if (!workspaceId || !runId) return this.recoverStart(request);
    const status = await this.deps.gateway.getLoopRun({ workspaceId, name: loopName(request), runId });
    return { ...this.reconciler.resolve(status.ok ? status.value : null), ...loopActivityUpdate(request.run, status.ok ? status.value.activity : null) };
  }

  async cancel(request: ExecutionRequest): Promise<ReconcileResult> {
    const { workspaceId, runId } = request.run.runtime;
    if (!workspaceId || !runId) return { state: "canceled", code: "never_started" };
    const status = await this.deps.gateway.cancelLoopRun({ workspaceId, name: loopName(request), runId });
    return { ...this.reconciler.resolve(status.ok ? status.value : null), ...loopActivityUpdate(request.run, status.ok ? status.value.activity : null) };
  }

  private async recoverStart(request: ExecutionRequest): Promise<ReconcileResult> {
    const snapshot = request.snapshot as ActionSnapshot & LoopFlowAction;
    const workspace = await this.deps.workspaceOf(request);
    if (!workspace) return { state: "unknown", code: null };
    const listed = await this.deps.gateway.listLoopRuns({ workspaceId: workspace.workspaceId, name: snapshot.loopName });
    if (!listed.ok) return { state: "unknown", code: null };
    const inputs = JSON.stringify(sortKeys(loopInputs(snapshot)));
    const matches = listed.value.filter((run) => run.createdAt >= request.run.createdAt.toISOString() && JSON.stringify(sortKeys(run.inputs)) === inputs);
    if (matches.length > 1) return { state: "unknown", code: null };
    if (matches.length === 1) return { state: "running", code: null, runtime: { workspaceId: workspace.workspaceId, runId: matches[0]!.runId } };
    const started = await this.start(request);
    if (!started.ok) return { state: "unknown", code: null };
    return { state: "running", code: null, runtime: { workspaceId: started.workspaceId, runId: started.runId } };
  }

  private async start(request: ExecutionRequest) {
    const snapshot = request.snapshot as ActionSnapshot & LoopFlowAction;
    try { await this.deps.beforeStart?.(request); } catch { return { ok: false as const, code: "worktree_not_ready" as ControlErrorCode }; }
    const workspace = await this.deps.workspaceOf(request);
    if (!workspace || (snapshot.worktreeId && !workspace.worktreePath) || snapshot.worktreeId !== request.run.worktreeId) return { ok: false as const, code: "worktree_not_ready" as ControlErrorCode };
    const result = await this.deps.gateway.startLoop({ workspaceId: workspace.workspaceId, name: snapshot.loopName, version: snapshot.loopVersion, inputs: loopInputs(snapshot), workerRuntime: workerRuntime(snapshot), requestId: requestIdFor(request.run.id), worktreeId: snapshot.workspace.kind === "local" ? null : snapshot.worktreeId });
    if (!result.ok) return { ok: false as const, code: result.code };
    const drifted = result.value.definitionVersion !== null && String(result.value.definitionVersion) !== snapshot.loopVersion;
    if (!drifted) return { ok: true as const, workspaceId: workspace.workspaceId, runId: result.value.runId };
    await this.deps.gateway.cancelLoopRun({ workspaceId: workspace.workspaceId, name: snapshot.loopName, runId: result.value.runId });
    return { ok: false as const, code: "loop_version_changed" as ControlErrorCode };
  }
}

const loopName = (request: ExecutionRequest) => (request.snapshot as ActionSnapshot & LoopFlowAction).loopName;
