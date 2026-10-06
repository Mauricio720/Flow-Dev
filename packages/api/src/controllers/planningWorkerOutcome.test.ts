import { describe, expect, it } from "vitest";
import { PlanningDomainError } from "../application/services/tasks/planningContracts";
import { TaskError } from "../application/services/tasks/taskErrors";
import { classifyPlanningError } from "./planningWorkerOutcome";

const now = new Date("2026-10-05T12:00:00.000Z");
const claim = { attempts: 1, deadline: new Date(now.getTime() + 900_000) };

describe("classifyPlanningError", () => {
  it("abandons only a stale execution silently", () => {
    expect(classifyPlanningError(new TaskError("stale_execution"), claim, now)).toEqual({ kind: "abandon", stale: true });
  });

  it("abandons unknown errors as unclassified", () => {
    expect(classifyPlanningError(new TypeError("boom"), claim, now)).toEqual({ kind: "abandon", stale: false });
  });

  it("fails invalid stored content immediately", () => {
    expect(classifyPlanningError(new TaskError("invalid_stored_content"), claim, now)).toEqual({ kind: "fail", reason: "invalid_stored_content" });
  });

  it.each(["publication_required", "planning_input_limit"] as const)("fails a domain error with its own reason %s", (reason) => {
    expect(classifyPlanningError(new PlanningDomainError(reason), claim, now)).toEqual({ kind: "fail", reason });
  });
});
