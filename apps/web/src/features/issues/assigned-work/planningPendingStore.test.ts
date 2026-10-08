import { afterEach, describe, expect, it } from "vitest";
import { loadPending, savePending } from "./planningPendingStore";

const KEY = "flow-dev:planning-pending:t";
const review = { action: "planning.approve" as const, requestKey: "k", taskId: "t", expectedVersion: 3, decisionId: "d", expectedDecisionVersion: 1, route: "prd" as const };

afterEach(() => window.sessionStorage.clear());

describe("planning pending store", () => {
  it("restores a complete command", () => {
    savePending(review);
    expect(loadPending("t")).toEqual(review);
  });

  it.each([
    ["a review without a route", { ...review, route: undefined }],
    ["a review with an unknown route", { ...review, route: "tasks" }],
    ["a review without a decision", { ...review, decisionId: undefined }],
    ["a retry without the failed operation", { action: "planning.retry", requestKey: "k", taskId: "t", expectedVersion: 3 }],
    ["an unknown action", { ...review, action: "planning.other" }],
  ])("discards %s", (_name, value) => {
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
    expect(loadPending("t")).toBeNull();
  });
});
