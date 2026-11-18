import { describe, expect, it } from "vitest";
import { TaskError } from "./taskErrors";
import { assertReplannable, canReplan, type ReplanFacts } from "./planningReplanRules";

const changedSource: ReplanFacts = { planningStatus: "approved", activeOperationId: null, sourceChanged: true };

describe("planning replan rules", () => {
  it("allows a new planning when the Issue changed after the approved planning", () => {
    expect(canReplan(changedSource)).toBe(true);
  });

  it("keeps the approved planning while it is current, in review or busy", () => {
    expect(canReplan({ ...changedSource, sourceChanged: false })).toBe(false);
    expect(canReplan({ ...changedSource, planningStatus: "review" })).toBe(false);
    expect(canReplan({ ...changedSource, activeOperationId: "op" })).toBe(false);
  });

  it("rejects an unavailable replan with a named reason", () => {
    expect(() => assertReplannable({ ...changedSource, sourceChanged: false })).toThrowError(new TaskError("replan_unavailable"));
  });
});
