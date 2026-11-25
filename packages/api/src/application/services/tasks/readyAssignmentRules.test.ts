import { describe, expect, it } from "vitest";
import { readyRefusal } from "./readyAssignmentRules";

describe("readyRefusal", () => {
  it("reports missing board before other requirements", () => {
    expect(readyRefusal({ hasBoard: false, statuses: [], canWriteContents: false })).toBe("ready_board_missing");
  });
  it("reports missing Ready before write permission", () => {
    expect(readyRefusal({ hasBoard: true, statuses: ["backlog"], canWriteContents: false })).toBe("ready_status_missing");
  });
  it("requires write permission when Ready exists", () => {
    expect(readyRefusal({ hasBoard: true, statuses: ["backlog", "ready"], canWriteContents: false })).toBe("assign_permission_denied");
  });
  it("does not require In Progress", () => {
    expect(readyRefusal({ hasBoard: true, statuses: ["backlog", "ready"], canWriteContents: true })).toBeNull();
  });
});
