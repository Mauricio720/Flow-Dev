import { describe, expect, it } from "vitest";
import { PlanningDomainError } from "./planningContracts";
import { parsePlanningAssessment, planningPayloadHash, selectionSource, assertPlanningReview } from "./planningRules";

const valid = { recommendedRoute: "tech_spec", complexity: "medium", summary: "Adicionar filtro", reasons: ["Altera o contrato"], uncertainties: [] };
const invalid = [
  {}, { ...valid, extra: true }, { ...valid, recommendedRoute: "tasks" }, { ...valid, complexity: "critical" },
  { ...valid, reasons: [] }, { ...valid, summary: " " }, { ...valid, reasons: [" "] },
];

describe("planning assessment rules", () => {
  it("UT-001 accepts the exact supported assessment", () => expect(parsePlanningAssessment(valid)).toEqual(valid));
  it.each(invalid)("UT-002 rejects malformed assessment %#", (assessment) => expect(() => parsePlanningAssessment(assessment)).toThrowError(new PlanningDomainError("planning_invalid_output")));
  it("UT-003 accepts all assessment collection and text boundaries", () => {
    const assessment = { ...valid, summary: "s".repeat(4_000), reasons: Array(20).fill("r".repeat(2_000)), uncertainties: Array(20).fill("u".repeat(2_000)) };
    expect(parsePlanningAssessment(assessment)).toEqual(assessment);
  });
  it.each([
    { ...valid, summary: "s".repeat(4_001) }, { ...valid, reasons: Array(21).fill("r") },
    { ...valid, uncertainties: Array(21).fill("u") }, { ...valid, reasons: ["r".repeat(2_001)] },
  ])("UT-004 rejects assessment content over limits", (assessment) => expect(() => parsePlanningAssessment(assessment)).toThrowError(new PlanningDomainError("planning_invalid_output")));
  it("UT-008 and UT-009 preserve recommendation provenance", () => {
    expect(selectionSource("tech_spec", "prd")).toBe("HUMAN_OVERRIDE");
    expect(selectionSource("tech_spec", "tech_spec")).toBe("AI");
  });
  it("UT-010 and UT-011 require exact saved review", () => {
    expect(() => assertPlanningReview(3, 2, "tech_spec", "tech_spec")).toThrowError(new PlanningDomainError("planning_conflict"));
    expect(() => assertPlanningReview(2, 2, "tech_spec", "prd")).toThrowError(new PlanningDomainError("planning_conflict"));
  });
  it("UT-019 hashes fixed-order command fields", () => {
    const first = { taskId: "t", requestKey: "k", expectedVersion: 7, decisionId: "d", selectedRoute: "prd" as const };
    const second = { selectedRoute: "prd" as const, decisionId: "d", expectedVersion: 7, requestKey: "k", taskId: "t" };
    expect(planningPayloadHash(first)).toBe(planningPayloadHash(second));
  });
});
