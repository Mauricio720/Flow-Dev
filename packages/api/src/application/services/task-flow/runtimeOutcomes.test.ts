import { describe, expect, it } from "vitest";
import { mapRuntimeFailure } from "./runtimeErrorMapper";
import { WorkerReconciler } from "./workerReconciler";

const status = (state: string) => ({ runId: "r1", state, terminalReason: null, definitionVersion: 3, createdAt: "2026-10-06T12:00:00Z", inputs: {} });

describe("runtime error mapper", () => {
  it("UT-019 reduces a provider 422 model_unavailable response to a safe code without the upstream body", () => {
    const error = mapRuntimeFailure({ status: 422, body: { code: "model_unavailable", detail: "token sk-secret rejected for acct 123" } });
    expect(error.reason).toBe("model_unavailable");
    expect(JSON.stringify(error)).not.toContain("sk-secret");
    expect(error.message).toBe("model_unavailable");
    expect(mapRuntimeFailure({ status: 422 }).reason).toBe("model_unavailable");
    expect(mapRuntimeFailure({ status: 401 }).reason).toBe("auth_required");
    expect(mapRuntimeFailure({ status: 503 }).reason).toBe("outcome_unknown");
    expect(mapRuntimeFailure({ status: 418 }).reason).toBe("runtime_incompatible");
  });
});

describe("worker reconciler", () => {
  const reconciler = new WorkerReconciler();

  it("UT-020 keeps an unknown Loop start unresolved until the authoritative runtime status arrives", () => {
    expect(reconciler.resolve(null)).toEqual({ state: "unknown", code: null });
    expect(reconciler.resolve(status("mystery"))).toEqual({ state: "unknown", code: null });
    expect(reconciler.resolve(status("running")).state).toBe("running");
    expect(reconciler.resolve(status("watching")).state).toBe("running");
    expect(reconciler.resolve(status("done")).state).toBe("succeeded");
  });

  it("IT-103 distinguishes failed, stalled, exhausted and canceled terminal outcomes", () => {
    const state = (value: string) => reconciler.resolve(status(value));
    expect([state("failed"), state("stalled"), state("exhausted"), state("canceled"), state("blocked")].map((result) => result.state)).toEqual(["failed", "stalled", "exhausted", "canceled", "blocked"]);
  });
});
