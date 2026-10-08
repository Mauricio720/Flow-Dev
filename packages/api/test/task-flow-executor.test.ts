import { afterEach, describe, expect, it } from "vitest";
import type { ExecutionRequest } from "../src/application/services/task-flow/actionExecutor";
import type { RunRecord } from "../src/application/database/dao/taskFlowDao";
import { COMPOZY_PIN } from "../src/application/spec/specPins";
import { CompozyRuntimeGateway } from "../src/infra/spec/compozy/compozyRuntimeGateway";
import { SnapshotRunExecutor } from "../src/infra/spec/compozy/snapshotRunExecutor";
import { startDaemon } from "./spec-daemon";

const closers: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(closers.splice(0).map((close) => close())); });

const PINS = { version: COMPOZY_PIN.version, openApiSha256: COMPOZY_PIN.openApiSha256, binarySha256: COMPOZY_PIN.binarySha256, bundleSha256: "b".repeat(64) };
const RUN_ID = "00000000-0000-4000-8000-0000000000a1";
const CONNECTION = "00000000-0000-4000-8000-0000000000c1";

function request(kind: "create_spec" | "loop" = "create_spec"): ExecutionRequest {
  const runtime = { connectionId: CONNECTION, providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: "high" };
  const snapshot = { kind, runtime, workspace: { kind: "isolated" }, connectionLabels: {}, runtimeProviderIds: { [CONNECTION]: "codex-ab12cd34" }, compozyVersion: "v0.3.0-beta.29", connectionRevisions: {}, accountFingerprints: {}, worktreeId: null };
  const run = { id: RUN_ID, taskId: "00000000-0000-4000-8000-0000000000b1", runtime: { workspaceId: null, sessionId: null, turnId: null, runId: null }, snapshot } as unknown as RunRecord;
  return { run, snapshot: snapshot as never, grants: [] };
}

async function executorFor(overrides = {}) {
  const daemon = await startDaemon({ permissions: "approve-all", ...overrides });
  closers.push(daemon.close);
  const stopped: string[] = [];
  const launcher = { start: async () => ({ socketPath: daemon.socketPath }), stop: async (runId: string) => { stopped.push(runId); } };
  const executor = new SnapshotRunExecutor({ gateway: new CompozyRuntimeGateway(), launcher, runtime: { agentName: "flow-spec", declared: PINS, accepted: PINS }, taskFor: async () => ({ title: "Carrinho", bodyMarkdown: "Corrigir total", issueNumber: 12 }) });
  return { daemon, executor, stopped };
}

describe("snapshot run executor", () => {
  it("accepts the unattended runtime policy and rejects a runtime requiring operator approval", async () => {
    const unattended = await executorFor();
    expect(await unattended.executor.execute(request())).toMatchObject({ kind: "submitted" });
    const restricted = await executorFor({ permissions: "approve-reads" });
    expect(await restricted.executor.execute(request())).toEqual({ kind: "failed", code: "runtime_incompatible" });
    expect(restricted.daemon.state.sessions).toHaveLength(0);
    expect(restricted.stopped).toEqual([RUN_ID]);
  });

  it("submits the first prompt with the snapshot's provider overlay, model and reasoning, never a global default", async () => {
    const { daemon, executor } = await executorFor();
    const result = await executor.execute(request());
    expect(result).toMatchObject({ kind: "submitted", runtime: { sessionId: "s1", turnId: "turn-1" } });
    expect(daemon.state.prompts[0]?.runtime).toEqual({ provider: "codex-ab12cd34", model: "gpt-5.6-sol", reasoning_effort: "high" });
  });

  it("IT-088 settles a provider 422 at the first prompt as blocked model_unavailable and prompts revalidation", async () => {
    const { executor, stopped } = await executorFor({ promptStatus: 422 });
    expect(await executor.execute(request())).toMatchObject({ kind: "blocked", code: "model_unavailable" });
    expect(stopped).toEqual([RUN_ID]);
  });

  it("stops the detached container before returning a verified terminal result", async () => {
    const { executor, stopped, daemon } = await executorFor();
    expect(await executor.execute(request())).toMatchObject({ kind: "submitted" });
    daemon.state.sessions[0]!.state = "stopped";
    daemon.state.sessions[0]!.verified = true;
    const active = request();
    active.run.runtime = { workspaceId: "w1", sessionId: "s1", turnId: "turn-1", runId: null };
    expect(await executor.reconcile(active)).toEqual({ state: "succeeded", code: null });
    expect(stopped).toEqual([RUN_ID]);
  });

  it("keeps an uncertain submission unknown, fails closed on pin drift and refuses loops in the skill executor", async () => {
    const dropped = await executorFor({ promptStatus: 503 });
    expect(await dropped.executor.execute(request())).toMatchObject({ kind: "unknown", runtime: { sessionId: "s1", workspaceId: "w1" } });
    const drift = await executorFor({ version: "0.3.0-beta.30" });
    expect(await drift.executor.execute(request())).toEqual({ kind: "failed", code: "runtime_incompatible" });
    expect(drift.stopped).toEqual([RUN_ID]);
    const loop = await executorFor();
    expect(await loop.executor.execute(request("loop"))).toEqual({ kind: "failed", code: "loop_unavailable" });
  });

  it("keeps cancellation unknown until the runtime confirms it", async () => {
    const { executor, stopped } = await executorFor();
    expect(await executor.cancel(request())).toEqual({ state: "unknown", code: "outcome_unknown" });
    expect(stopped).toEqual([]);
  });
});
