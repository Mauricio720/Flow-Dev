import { createHash } from "node:crypto";
import type { ActionExecutor, ExecutionRequest, ExecutionResult, ReconcileResult } from "../../../application/services/task-flow/actionExecutor";
import type { FlowAction } from "../../../application/services/task-flow/flowContracts";
import { isCanceledStopReason } from "../../../application/spec/specRuntimeOutcomes";
import type { RuntimeConfiguration, SpecRuntimeGateway } from "../../../application/spec/specRuntimeGateway";
import { SpecRuntimeError } from "./compozyErrors";
import { rejectedSubmission } from "./submissionRejection";
import { failureDetailOf } from "../../../application/services/local-execution/localFailureDetail";
import { runPreflight } from "./compozyPreflight";
import { unixSocketTransport } from "./compozyTransport";
import { buildUnifiedPrompt, type PromptTask } from "./unifiedPrompt";
import { readSnapshotRunActivity, terminalStateFromActivity, type SnapshotTerminalState } from "./snapshotRunActivity";

export type RunLauncher = {
  start(input: ExecutionRequest): Promise<{ socketPath: string }>;
  stop(runId: string): Promise<void>;
};
export type SnapshotExecutorDependencies = {
  gateway: SpecRuntimeGateway;
  launcher: RunLauncher;
  runtime: Omit<RuntimeConfiguration, "socketPath" | "provider" | "model">;
  taskFor(request: ExecutionRequest): Promise<PromptTask>;
  beforeSubmit?(request: ExecutionRequest): Promise<void>;
  workspaceRoot?(request: ExecutionRequest): string;
};
const WORKSPACE_ROOT = "/workspace";
const idFor = (runId: string, purpose: string) => createHash("sha256").update(`${purpose}:${runId}`).digest("hex").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*$/, "$1-$2-$3-$4-$5");
type ActivityUpdate = Partial<Pick<ReconcileResult, "runtimeEventSequence" | "activity">>;

export class SnapshotRunExecutor implements ActionExecutor {
  constructor(private readonly deps: SnapshotExecutorDependencies) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      return await this.submit(request);
    } catch (error) {
      if (error instanceof SpecRuntimeError && error.uncertain) return { kind: "unknown" };
      try { await this.deps.launcher.stop(request.run.id); } catch { return { kind: "unknown" }; }
      const detail = failureDetailOf(error);
      return { kind: "failed", code: error instanceof SpecRuntimeError ? error.reason : "runtime_failed", ...(detail ? { detail } : {}) };
    }
  }

  async cancel(request: ExecutionRequest): Promise<ReconcileResult> {
    const { sessionId, workspaceId } = request.run.runtime;
    if (!sessionId || !workspaceId) return { state: "unknown", code: "outcome_unknown" };
    try {
      const { socketPath } = await this.deps.launcher.start(request);
      const stop = await this.deps.gateway.stop({ socketPath, workspaceId, sessionId });
      if (!stop.verified || !stop.settled || !stop.canceled) return { state: "unknown", code: "outcome_unknown" };
      await this.deps.launcher.stop(request.run.id);
      return { state: "canceled", code: "canceled_by_author" };
    } catch { return { state: "unknown", code: "outcome_unknown" }; }
  }

  async answerQuestion(request: ExecutionRequest, input: { interactionId: string; answer: string }) {
    const { sessionId, workspaceId } = request.run.runtime;
    if (!sessionId || !workspaceId) return false;
    const socket = await this.deps.launcher.start(request).catch(() => null);
    if (!socket) return false;
    const runtimeIdentity = { socketPath: socket.socketPath, workspaceId, sessionId };
    const question = (await this.deps.gateway.interactions(runtimeIdentity).catch(() => []))
      .find((item) => item.id === input.interactionId && item.kind === "question" && item.status === "pending");
    if (!question) return false;
    const result = await this.deps.gateway.resolve({ ...runtimeIdentity, kind: "question", requestId: question.providerRequestId, text: input.answer }).catch(() => null);
    return Boolean(result && (result.delivered || result.outcome === "already_resolved"));
  }

  async reconcile(request: ExecutionRequest): Promise<ReconcileResult> {
    const { sessionId, workspaceId } = request.run.runtime;
    if (!sessionId || !workspaceId) {
      try { await this.deps.launcher.stop(request.run.id); } catch { return { state: "unknown", code: null }; }
      return { state: "failed", code: "runtime_failed" };
    }
    let socketPath: string;
    try {
      ({ socketPath } = await this.deps.launcher.start(request));
    } catch {
      try { await this.deps.launcher.stop(request.run.id); } catch { return { state: "unknown", code: null }; }
      return { state: "failed", code: "runtime_failed" };
    }
    const previousSequence = request.run.runtimeEventSequence ?? 0;
    const activity = await readSnapshotRunActivity(this.deps.gateway, { socketPath, workspaceId, sessionId, afterSequence: previousSequence }, this.deps.workspaceRoot?.(request));
    const activityUpdate = activity.sequence > previousSequence ? { runtimeEventSequence: activity.sequence, activity: activity.activity } : {};
    const terminalState = activity.terminalState ?? terminalStateFromActivity(activity.activity) ?? terminalStateFromActivity(request.run.activity);
    if (terminalState) return this.finish(request.run.id, terminalState, activityUpdate);
    const snapshot = await this.deps.gateway.inspect({ socketPath, workspaceId, sessionId });
    if (snapshot.state !== "stopped") return { state: "running", code: null, ...activityUpdate };
    try { await this.deps.launcher.stop(request.run.id); } catch { return { state: "unknown", code: null }; }
    if (isCanceledStopReason(snapshot.stopReason) || isCanceledStopReason(snapshot.stopCause)) return { state: "canceled", code: "runtime_canceled", ...activityUpdate };
    return snapshot.verified && !snapshot.stopCause ? { state: "succeeded", code: null, ...activityUpdate } : { state: "failed", code: snapshot.stopCause ?? "runtime_failed", ...activityUpdate };
  }

  private async finish(runId: string, state: SnapshotTerminalState, activity: ActivityUpdate): Promise<ReconcileResult> {
    try { await this.deps.launcher.stop(runId); } catch { return { state: "unknown", code: null, ...activity }; }
    return { state, code: state === "canceled" ? "runtime_canceled" : null, ...activity };
  }
  private async submit(request: ExecutionRequest): Promise<ExecutionResult> {
    const action = request.snapshot as FlowAction & typeof request.snapshot;
    if (action.kind === "loop") return { kind: "failed", code: "loop_unavailable" };
    if (action.kind === "create_tasks") await this.deps.beforeSubmit?.(request);
    const { socketPath } = await this.deps.launcher.start(request);
    const config = { ...this.deps.runtime, socketPath, provider: "", model: "", permissionMode: "approve-all" as const };
    await runPreflight(unixSocketTransport(socketPath), config, false);
    const session = await this.deps.gateway.create({ socketPath, workspaceRoot: this.deps.workspaceRoot?.(request) ?? WORKSPACE_ROOT, workspaceName: `flow-${request.run.taskId}`, agentName: this.deps.runtime.agentName, sessionName: `run-${request.run.id}` });
    const runtimeIdentity = { workspaceId: session.workspaceId, sessionId: session.sessionId, turnId: null };
    const message = buildUnifiedPrompt({ action, task: await this.deps.taskFor(request), workspaceRoot: this.deps.workspaceRoot?.(request) });
    const { runtime } = action;
    let submission: Awaited<ReturnType<SpecRuntimeGateway["submit"]>>;
    try {
      submission = await this.deps.gateway.submit({ socketPath, workspaceId: session.workspaceId, sessionId: session.sessionId, messageId: idFor(request.run.id, "message"), idempotencyKey: idFor(request.run.id, "prompt"), message, provider: action.runtimeProviderIds[runtime.connectionId], model: runtime.modelId, reasoningEffort: runtime.reasoningEffort });
    } catch (error) {
      if (error instanceof SpecRuntimeError && error.uncertain) return { kind: "unknown", runtime: runtimeIdentity };
      throw error;
    }
    if (submission.status === "rejected") {
      try { await this.deps.launcher.stop(request.run.id); } catch { return { kind: "unknown", runtime: runtimeIdentity }; }
      return rejectedSubmission(submission.rejection);
    }
    if (submission.status !== "accepted") return { kind: "unknown", runtime: runtimeIdentity };
    return { kind: "submitted", runtime: { workspaceId: session.workspaceId, sessionId: session.sessionId, turnId: submission.turnId } };
  }
}
