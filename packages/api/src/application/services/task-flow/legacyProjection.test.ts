import { describe, expect, it } from "vitest";
import type { LegacyFlowReader, LegacyWorkflowRecord } from "../../database/dao/legacyFlowDao";
import { LegacyProjection } from "./legacyProjection";

const APPROVED_AT = new Date("2026-09-01T10:00:00Z");
const WORKFLOW: LegacyWorkflowRecord = {
  workflowId: "wf-1",
  route: "prd",
  currentStage: "tasks",
  state: "approved",
  version: 7,
  stages: [
    { stage: "prd", state: "approved", currentPackageId: "pkg-prd", approvedPackageId: "pkg-prd", approvedAt: APPROVED_AT },
    { stage: "tech_spec", state: "approved", currentPackageId: "pkg-tech", approvedPackageId: "pkg-tech", approvedAt: APPROVED_AT },
    { stage: "tasks", state: "not_started", currentPackageId: null, approvedPackageId: null, approvedAt: null },
  ],
};

const readerOf = (workflow: LegacyWorkflowRecord | null): LegacyFlowReader => ({ readWorkflow: async () => workflow });

describe("legacy projection", () => {
  it("UT-018 returns the approved PRD and Tech Spec labels and package IDs unchanged", async () => {
    const view = await new LegacyProjection(readerOf(WORKFLOW)).read("task-1");
    expect(view).toMatchObject({ flow: "legacy", route: "prd", version: 7 });
    expect(view?.stages.map((stage) => [stage.stage, stage.label, stage.approvedPackageId])).toEqual([
      ["prd", "PRD", "pkg-prd"],
      ["tech_spec", "Tech Spec", "pkg-tech"],
      ["tasks", "Tasks", null],
    ]);
    expect(view?.stages[0]?.approvedAt).toBe(APPROVED_AT);
  });

  it("returns null when the task has no legacy workflow", async () => {
    expect(await new LegacyProjection(readerOf(null)).read("task-2")).toBeNull();
  });
});
