import { describe, expect, it } from "vitest";
import { AssignedIssueError } from "./assignedIssueErrors";
import { DISPATCH_SETTLE_MS, assertFence, isDispatchSettled, isHeld } from "./issueClaimRules";

describe("issueClaimRules", () => {
  it("UT-091 rejects a settlement whose fence is older than the stored fence", () => {
    expect(() => assertFence(4, 5)).toThrow(AssignedIssueError);
    expect(() => assertFence(4, 5)).toThrow("stale_fence");
    expect(() => assertFence(5, 5)).not.toThrow();
  });

  it("holds pending, uncertain and claimed states but releases failed and unclaimed", () => {
    expect(["pending", "uncertain", "claimed"].every((state) => isHeld(state as never))).toBe(true);
    expect(isHeld("failed")).toBe(false);
    expect(isHeld("unclaimed")).toBe(false);
  });

  it("considers a dispatch settled only after the settle window", () => {
    const started = new Date("2026-10-06T12:00:00Z");
    expect(isDispatchSettled(null, started)).toBe(false);
    expect(isDispatchSettled(started, new Date(started.getTime() + DISPATCH_SETTLE_MS - 1))).toBe(false);
    expect(isDispatchSettled(started, new Date(started.getTime() + DISPATCH_SETTLE_MS))).toBe(true);
  });
});
