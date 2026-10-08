import { describe, expect, it } from "vitest";
import type { ExecutionRequest } from "../../../application/services/task-flow/actionExecutor";
import type { CompozyControlGateway, LoopRunStatus } from "../../../application/software/compozyControlGateway";
import { controlOk } from "../../../application/software/controlErrors";
import { LoopRunExecutor } from "./loopRunExecutor";

const activity = { sequence: 100, at: "2026-10-08T19:58:58Z", kind: "agent_message" as const, preview: "Validando a tarefa 3", tool: null, source: null, status: null };
const status: LoopRunStatus = { runId: "loop-1", state: "running", terminalReason: null, definitionVersion: 0, createdAt: activity.at, inputs: {}, activity };

describe("Loop activity persistence cursor", () => {
  it("advances the run cursor across child session changes and does not persist duplicate polls", async () => {
    let current = status;
    const gateway = { getLoopRun: async () => controlOk(current, "pinned") } as unknown as CompozyControlGateway;
    const executor = new LoopRunExecutor({ gateway, workspaceOf: async () => null });
    const request = { snapshot: { kind: "loop", loopName: "implement-tasks" }, run: { runtime: { workspaceId: "ws-1", runId: "loop-1" }, runtimeEventSequence: 4, activity: null } } as unknown as ExecutionRequest;
    const first = await executor.reconcile(request);
    expect(first).toMatchObject({ state: "running", runtimeEventSequence: 5, activity: { sequence: 5, preview: activity.preview } });
    Object.assign(request.run, { runtimeEventSequence: 5, activity: first.activity });
    expect(await executor.reconcile(request)).not.toHaveProperty("runtimeEventSequence");
    current = { ...status, state: "failed", terminalReason: "usage_limit_exceeded", activity: { ...activity, sequence: 1, kind: "warning", preview: "You’ve hit your usage limit." } };
    expect(await executor.reconcile(request)).toMatchObject({ state: "failed", code: "usage_limit_exceeded", runtimeEventSequence: 6, activity: { sequence: 6, kind: "warning" } });
  });
});
