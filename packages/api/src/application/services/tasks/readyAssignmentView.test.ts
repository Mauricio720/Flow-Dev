import { describe, expect, it } from "vitest";
import { READY_ASSIGNMENT_WINDOW_MS, readyAssignmentView } from "./readyAssignmentView";

const createdAt = new Date("2026-10-01T12:00:00.000Z");

describe("readyAssignmentView", () => {
  it("hides the result when assignment was not requested", () => {
    expect(readyAssignmentView({ assignToSelf: false, readyAssignment: null, createdAt }, createdAt)).toBeNull();
  });
  it("shows pending before two minutes and unconfirmed at two minutes", () => {
    expect(readyAssignmentView({ assignToSelf: true, readyAssignment: null, createdAt }, new Date(createdAt.getTime() + READY_ASSIGNMENT_WINDOW_MS - 1))).toEqual({ state: "pending" });
    expect(readyAssignmentView({ assignToSelf: true, readyAssignment: null, createdAt }, new Date(createdAt.getTime() + READY_ASSIGNMENT_WINDOW_MS))).toEqual({ state: "unconfirmed" });
  });
  it.each(["ready", "not_assigned", "ready_failed"] as const)("keeps the stored %s result", (readyAssignment) => {
    expect(readyAssignmentView({ assignToSelf: true, readyAssignment, createdAt }, new Date(createdAt.getTime() + READY_ASSIGNMENT_WINDOW_MS))).toEqual({ state: readyAssignment });
  });
});
