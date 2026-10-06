import { describe, expect, it } from "vitest";
import { specEligibility, type SpecEligibilityInput } from "./specEligibility";

const publication = { outcome: "created", repositoryBindingMatches: true, issueId: "4101", issueNumber: 42, title: "Título", bodyMarkdown: "Corpo" };
const base: SpecEligibilityInput = { taskStatus: "published", publication, planning: { status: "approved", selectedRoute: "prd" } };

describe("specEligibility", () => {
  it("UT-005 follows the approved selected route over the recommendation", () => {
    expect(specEligibility(base)).toEqual({ canStart: true, reason: null, route: "prd", firstStage: "prd" });
    expect(specEligibility({ ...base, planning: { status: "approved", selectedRoute: "tech_spec" } })).toMatchObject({ route: "tech_spec", firstStage: "tech_spec" });
  });

  it("UT-006 blocks direct execution without a replacement stage", () => {
    expect(specEligibility({ ...base, planning: { status: "approved", selectedRoute: "direct_execution" } })).toEqual({ canStart: false, reason: "route_unsupported", route: null, firstStage: null });
  });

  it("blocks missing publication and unapproved planning before route checks", () => {
    expect(specEligibility({ ...base, publication: null }).reason).toBe("publication_required");
    expect(specEligibility({ ...base, publication: { ...publication, bodyMarkdown: " " } }).reason).toBe("publication_required");
    expect(specEligibility({ ...base, taskStatus: "draft_ready" }).reason).toBe("publication_required");
    expect(specEligibility({ ...base, planning: { status: "review", selectedRoute: "prd" } }).reason).toBe("planning_required");
    expect(specEligibility({ ...base, planning: null }).reason).toBe("planning_required");
  });
});
