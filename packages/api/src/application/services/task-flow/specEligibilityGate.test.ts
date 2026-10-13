import { describe, expect, it } from "vitest";
import type { TaskSpecDao } from "../../database/dao/taskSpecDao";
import { SpecEligibilityGate } from "./specEligibilityGate";

const scope = { projectId: "p1", taskId: "t1", actorId: "u1" };
const publication = { outcome: "created", repositoryBindingMatches: true, issueId: "I_1", issueNumber: 7, title: "Título", bodyMarkdown: "Corpo" };

function gateFor(planning: { status: string; selectedRoute: string } | null) {
  const eligibility = { taskStatus: "published", publication, planning };
  return new SpecEligibilityGate({ snapshot: async () => ({ eligibility }) } as unknown as TaskSpecDao);
}

describe("SpecEligibilityGate", () => {
  it("lets an approved direct route plan through the direct flow", async () => {
    await expect(gateFor({ status: "approved", selectedRoute: "direct_execution" }).eligibility(scope)).resolves.toEqual({ canPlan: true, reason: null, route: "direct" });
  });

  it("keeps spec routes on the spec flow", async () => {
    await expect(gateFor({ status: "approved", selectedRoute: "tech_spec" }).eligibility(scope)).resolves.toEqual({ canPlan: true, reason: null, route: "spec" });
  });

  it("still requires an approved planning decision for the direct route", async () => {
    await expect(gateFor({ status: "review", selectedRoute: "direct_execution" }).eligibility(scope)).resolves.toEqual({ canPlan: false, reason: "planning_required", route: "direct" });
  });
});
