import { describe, expect, it } from "vitest";
import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import { caveatsPrompt, executeContinuation, executeInitialPrompt, reviewContinuation, reviewInitialPrompt } from "./reviewPrompts";
import { retryPrompt } from "./reviewRetryPrompt";

const FOLDER = "docs/specs/x";
const REPORT = "docs/specs/x/reviews/review-004.md";

function cycleAt(round: number, partial = false) {
  return { round, partial, tasksFolder: FOLDER } as ReviewCycleRecord;
}

describe("retryPrompt", () => {
  it("repeats the review prompt of the round", () => {
    expect(retryPrompt({ cycle: cycleAt(1), role: "review", reportPath: null, verdict: null })).toBe(reviewInitialPrompt({ folder: FOLDER, partial: false }));
    expect(retryPrompt({ cycle: cycleAt(3, true), role: "review", reportPath: null, verdict: null })).toBe(reviewContinuation({ folder: FOLDER, partial: true }));
  });

  it("repeats the execution prompt of a rejected round", () => {
    expect(retryPrompt({ cycle: cycleAt(1), role: "execute", reportPath: REPORT, verdict: "rejected" })).toBe(executeInitialPrompt({ folder: FOLDER, reportPath: REPORT }));
    expect(retryPrompt({ cycle: cycleAt(2), role: "execute", reportPath: REPORT, verdict: "rejected" })).toBe(executeContinuation({ folder: FOLDER, reportPath: REPORT }));
  });

  it("repeats the caveats message when the round ended with caveats", () => {
    expect(retryPrompt({ cycle: cycleAt(2), role: "execute", reportPath: REPORT, verdict: "caveats" })).toBe(caveatsPrompt({ folder: FOLDER, reportPath: REPORT }));
  });
});
