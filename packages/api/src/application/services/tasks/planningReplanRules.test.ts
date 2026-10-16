import { describe, expect, it } from "vitest";
import { TaskError } from "./taskErrors";
import { assertReplannable, canReplan, type ReplanFacts } from "./planningReplanRules";

const stoppedDirect: ReplanFacts = { planningStatus: "approved", activeOperationId: null, selectedRoute: "direct_execution", sourceChanged: false, actions: [{ kind: "direct_execute", state: "blocked" }] };

describe("planning replan rules", () => {
  it("allows a new planning after a stopped direct execution", () => {
    expect(canReplan(stoppedDirect)).toBe(true);
    expect(canReplan({ ...stoppedDirect, actions: [{ kind: "direct_execute", state: "failed" }] })).toBe(true);
    expect(canReplan({ ...stoppedDirect, actions: [{ kind: "direct_execute", state: "canceled" }] })).toBe(true);
  });

  it("allows a new planning when the Issue changed before any action finished", () => {
    expect(canReplan({ ...stoppedDirect, selectedRoute: "tech_spec", sourceChanged: true, actions: [] })).toBe(true);
    expect(canReplan({ ...stoppedDirect, selectedRoute: "tech_spec", sourceChanged: true, actions: [{ kind: "create_spec", state: "failed" }] })).toBe(true);
  });

  it("keeps the approved planning while work is running, succeeded or never started", () => {
    expect(canReplan({ ...stoppedDirect, planningStatus: "review" })).toBe(false);
    expect(canReplan({ ...stoppedDirect, activeOperationId: "op" })).toBe(false);
    expect(canReplan({ ...stoppedDirect, actions: [{ kind: "direct_execute", state: "running" }] })).toBe(false);
    expect(canReplan({ ...stoppedDirect, actions: [{ kind: "direct_execute", state: "succeeded" }] })).toBe(false);
    expect(canReplan({ ...stoppedDirect, actions: [{ kind: "direct_execute", state: "planned" }] })).toBe(false);
    expect(canReplan({ ...stoppedDirect, selectedRoute: "tech_spec", actions: [{ kind: "create_spec", state: "failed" }] })).toBe(false);
    expect(canReplan({ ...stoppedDirect, sourceChanged: true, actions: [{ kind: "create_spec", state: "succeeded" }] })).toBe(false);
  });

  it("rejects an unavailable replan with a named reason", () => {
    expect(() => assertReplannable({ ...stoppedDirect, actions: [] })).toThrowError(new TaskError("replan_unavailable"));
  });
});
