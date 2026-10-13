import { describe, expect, it } from "vitest";
import type { PlanRecord, RunRecord } from "../../database/dao/taskFlowDao";
import { planView } from "./taskFlowViews";

const PLANNED = { role: "fixer_runtime", connectionId: "c-opencode", providerId: "opencode", modelId: "deepseek", reasoningEffort: "high" };
const RETRIED = { connectionId: "c-codex", providerId: "codex", modelId: "gpt-luna", reasoningEffort: "high" };
const action = (id: string) => ({ id, position: 1, kind: "loop", loopName: "review-and-fix", loopVersion: "1", inputs: {}, workspace: { kind: "isolated" }, state: "queued", concludedAt: null, bindings: [PLANNED] });
const PLAN = { id: "p1", revision: 1, status: "active", actions: [action("a1"), action("a2")] } as unknown as PlanRecord;
const RUN = { id: "r1", actionId: "a1", attemptNumber: 5, state: "running", connectionIds: ["c-codex"], snapshot: { kind: "loop", runtimeBindings: { fixer_runtime: RETRIED }, connectionLabels: { "c-codex": "Codex local" } } } as unknown as RunRecord;

describe("planView", () => {
  it("exposes the attempt in flight beside the untouched plan, on its action only", () => {
    const [current, other] = planView(PLAN, new Map(), RUN).actions;
    expect(current).toMatchObject({ state: "queued", bindings: [{ modelId: "deepseek" }] });
    expect(current?.activeRun).toMatchObject({ state: "running", bindings: [{ role: "fixer_runtime", modelId: "gpt-luna", connectionLabel: "Codex local" }] });
    expect(other?.activeRun).toBeNull();
  });

  it("keeps the planned state and runtimes without an attempt in flight", () => {
    expect(planView(PLAN, new Map()).actions[0]).toMatchObject({ state: "queued", activeRun: null, bindings: [{ modelId: "deepseek" }] });
  });
});
