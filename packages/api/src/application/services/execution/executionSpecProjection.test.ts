import { describe, expect, it } from "vitest";
import type { CompozyTaskState } from "../../compozy/compozyGateway";
import { projectSpecExecution } from "./executionSpecProjection";

const approvedSpec: CompozyTaskState = { taskId: "spec", status: "completed", latestRun: { runId: "run-1", status: "completed", attempt: 1, sessionId: null, error: null }, latestReview: { reviewId: "review-1", runId: "run-1", status: "completed", outcome: "approved", summary: null }, openBlocks: [] };
const waitingDelivery: CompozyTaskState = { taskId: "delivery", status: "blocked", latestRun: null, latestReview: null, openBlocks: [] };

describe("spec execution projection", () => {
  it("waits for human spec review after the spec task is approved", () => {
    const result = projectSpecExecution({ specTask: approvedSpec, deliveryTask: waitingDelivery, pullRequestUrl: null, currentState: "spec_in_progress", specRound: 1 });
    expect(result.state).toBe("spec_review");
  });

  it("keeps a requested revision in progress while the previous approved run is still latest", () => {
    const result = projectSpecExecution({ specTask: approvedSpec, deliveryTask: waitingDelivery, pullRequestUrl: null, currentState: "spec_in_progress", specRound: 2 });
    expect(result.state).toBe("spec_in_progress");
  });

  it("does not reopen spec review after human approval of the delivery task", () => {
    const result = projectSpecExecution({ specTask: approvedSpec, deliveryTask: waitingDelivery, pullRequestUrl: null, currentState: "in_progress", specRound: 1 });
    expect(result.state).toBe("in_progress");
  });
});
