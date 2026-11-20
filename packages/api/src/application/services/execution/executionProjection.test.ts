import { describe, expect, it } from "vitest";
import type { CompozyTaskState } from "../../compozy/compozyGateway";
import { projectExecution } from "./executionProjection";

const task = (overrides: Partial<CompozyTaskState> = {}): CompozyTaskState => ({ taskId: "task", status: "running", latestRun: { runId: "run-1", status: "running", attempt: 1, sessionId: "session", error: null }, latestReview: null, openBlocks: [], ...overrides });
const projection = (state: CompozyTaskState) => projectExecution({ task: state, maxAttempts: 3, agent: "code_implementer", pullRequestUrl: null });

describe("execution state projection", () => {
  it("UT-014 maps a running task to in_progress", () => {
    expect(projection(task()).state).toBe("in_progress");
  });

  it("UT-015 maps an approved completed run to completed with its pull request", () => {
    const current = task({ status: "completed", latestRun: { runId: "run-1", status: "completed", attempt: 1, sessionId: "session", error: null }, latestReview: { reviewId: "review", runId: "run-1", status: "completed", outcome: "approved", summary: "Pronto" } });
    expect(projectExecution({ task: current, maxAttempts: 3, agent: "code_implementer", pullRequestUrl: "https://github.com/acme/app/pull/87" })).toMatchObject({ state: "completed", pullRequestUrl: "https://github.com/acme/app/pull/87" });
  });

  it("UT-016 preserves a rejected review while a continuation is queued", () => {
    const current = task({ latestReview: { reviewId: "review", runId: "run-1", status: "completed", outcome: "rejected", summary: "Falta teste" }, latestRun: { runId: "run-2", status: "queued", attempt: 2, sessionId: null, error: null } });
    expect(projection(current)).toMatchObject({ state: "in_progress", detail: { review: { outcome: "rejected", summary: "Falta teste" } } });
  });

  it("UT-017 reports an open block as needs_attention", () => {
    expect(projection(task({ openBlocks: [{ kind: "needs_input", reason: "Falta acesso" }] }))).toMatchObject({ state: "needs_attention", detail: { attention: "Falta acesso" } });
  });

  it("UT-018 marks exhausted failures with their last error", () => {
    expect(projection(task({ status: "failed", latestRun: { runId: "run-3", status: "failed", attempt: 3, sessionId: null, error: "worker crashed" } }))).toMatchObject({ state: "failed", failureCode: "attempts_exhausted", failureDetail: "worker crashed" });
  });

});
