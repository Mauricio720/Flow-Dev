import { describe, expect, it } from "vitest";
import { allowedActions, applyAction, applyStage } from "./reviewCycleRules";
import { FINAL_REVIEW_STATES, isFinalReviewState } from "./reviewCycleTypes";

describe("review cycle rules", () => {
  it("V-02a offers only the actions allowed in each state", () => {
    expect(allowedActions("reviewing")).toEqual(["stop"]);
    expect(allowedActions("executing")).toEqual(["stop"]);
    expect(allowedActions("caveats")).toEqual(["accept", "fix"]);
    expect(allowedActions("failed")).toEqual(["retry", "stop"]);
    for (const state of FINAL_REVIEW_STATES) expect(allowedActions(state)).toEqual([]);
  });

  it("V-02b refuses an action that is not allowed for the state", () => {
    expect(() => applyAction({ state: "reviewing", role: "review", round: 1 }, "accept")).toThrowError(expect.objectContaining({ reason: "review_action_invalid" }));
    expect(() => applyAction({ state: "executing", role: "execute", round: 1 }, "retry")).toThrowError(expect.objectContaining({ reason: "review_action_invalid" }));
    expect(() => applyAction({ state: "failed", role: "review", round: 1 }, "fix")).toThrowError(expect.objectContaining({ reason: "review_action_invalid" }));
    expect(() => applyAction({ state: "approved", role: "review", round: 1 }, "stop")).toThrowError(expect.objectContaining({ reason: "review_action_invalid" }));
  });

  it("V-02c maps review and execution stages to their next transitions", () => {
    expect(applyStage({ state: "reviewing", role: "review", round: 1 }, "execute")).toEqual({ state: "executing", role: "execute", round: 1, verdict: "rejected", ends: false });
    expect(applyStage({ state: "reviewing", role: "review", round: 1 }, "aprovada")).toEqual({ state: "approved", role: "review", round: 1, verdict: "approved", ends: true });
    expect(applyStage({ state: "reviewing", role: "review", round: 1 }, "ressalvas")).toEqual({ state: "caveats", role: "review", round: 1, verdict: "caveats", ends: false });
    expect(applyStage({ state: "executing", role: "execute", round: 7 }, "review")).toEqual({ state: "reviewing", role: "review", round: 8, verdict: null, ends: false });
    expect(() => applyStage({ state: "reviewing", role: "review", round: 1 }, "review")).toThrowError(expect.objectContaining({ reason: "review_action_invalid" }));
    expect(() => applyStage({ state: "executing", role: "execute", round: 1 }, "execute")).toThrowError(expect.objectContaining({ reason: "review_action_invalid" }));
  });

  it("V-02d stops, retries the same role and handles caveats actions", () => {
    expect(applyAction({ state: "failed", role: "review", round: 3 }, "retry")).toEqual({ state: "reviewing", role: "review", round: 3, verdict: null, ends: false });
    expect(applyAction({ state: "failed", role: "execute", round: 3 }, "retry")).toEqual({ state: "executing", role: "execute", round: 3, verdict: null, ends: false });
    expect(applyAction({ state: "caveats", role: "review", round: 2 }, "fix")).toEqual({ state: "executing", role: "execute", round: 2, verdict: null, ends: false });
    expect(applyAction({ state: "caveats", role: "review", round: 2 }, "accept")).toEqual({ state: "accepted", role: "review", round: 2, verdict: null, ends: true });
    expect(applyAction({ state: "reviewing", role: "review", round: 2 }, "stop")).toEqual({ state: "stopped", role: "review", round: 2, verdict: null, ends: true });
    expect(applyAction({ state: "failed", role: "execute", round: 2 }, "stop")).toMatchObject({ state: "stopped", ends: true });
  });

  it("V-02e applies a valid stage after a failure", () => {
    expect(applyStage({ state: "failed", role: "review", round: 3 }, "execute")).toMatchObject({ state: "executing", role: "execute", round: 3, verdict: "rejected" });
    expect(applyStage({ state: "failed", role: "execute", round: 7 }, "review")).toMatchObject({ state: "reviewing", role: "review", round: 8 });
  });

  it("V-02f marks only approved, accepted and stopped as final", () => {
    expect(ALL_REVIEW_STATES.map(isFinalReviewState)).toEqual([false, false, false, false, true, true, true]);
  });
});

const ALL_REVIEW_STATES = ["reviewing", "executing", "caveats", "failed", ...FINAL_REVIEW_STATES] as const;
