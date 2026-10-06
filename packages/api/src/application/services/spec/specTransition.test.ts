import { describe, expect, it } from "vitest";
import { assertStageTransition, specTransition } from "./specTransition";
import { assertStagePrerequisite, nextStage } from "./specStages";

describe("specTransition", () => {
  it("UT-007 releases the Tasks start without dispatching it after TechSpec approval", () => {
    const result = specTransition({ route: "tech_spec", stages: { tech_spec: "review" }, event: { type: "approve", stage: "tech_spec" } });
    expect(result).toMatchObject({ canStartTasks: true, dispatchCount: 0, released: "tasks", stages: { tech_spec: "approved" } });
  });

  it("UT-008 rejects leaving the approved state", () => {
    expect(() => assertStageTransition("approved", "running")).toThrow(expect.objectContaining({ reason: "stage_approved" }));
    expect(() => specTransition({ route: "prd", stages: { prd: "approved" }, event: { type: "start", stage: "prd" } })).toThrow(expect.objectContaining({ reason: "stage_approved" }));
  });

  it("only approves a stage that is in review", () => {
    expect(() => specTransition({ route: "prd", stages: { prd: "running" }, event: { type: "approve", stage: "prd" } })).toThrow(expect.objectContaining({ reason: "spec_conflict" }));
  });

  it("orders stages by route", () => {
    expect(nextStage("prd", "prd")).toBe("tech_spec");
    expect(nextStage("tech_spec", "tasks")).toBeNull();
    expect(() => assertStagePrerequisite({ route: "tech_spec", stage: "prd", approved: [] })).toThrow(expect.objectContaining({ reason: "stage_prerequisite" }));
    expect(() => assertStagePrerequisite({ route: "prd", stage: "tasks", approved: ["prd"] })).toThrow(expect.objectContaining({ reason: "stage_prerequisite" }));
    expect(() => assertStagePrerequisite({ route: "prd", stage: "tasks", approved: ["prd", "tech_spec"] })).not.toThrow();
  });
});
