import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { PlanningDomainError } from "./planningContracts";
import { buildPlanningInput, planningEligibility } from "./planningRules";

const correlation = { taskId: "20000000-0000-4000-8000-000000000001", operationId: "40000000-0000-4000-8000-000000000001", executionId: "40000000-0000-4000-8000-000000000002" };
const publication = { outcome: "created", taskId: correlation.taskId, repositoryBindingMatches: true, attemptId: "70000000-0000-4000-8000-000000000001", repositoryId: "42", repositoryNodeId: "R_42", issueId: "501", issueNumber: 5, issueUrl: "https://github.com/team/flow/issues/5", title: "Adicionar filtro", bodyMarkdown: "## Objetivo\nFiltrar.\n" };
const input = () => buildPlanningInput(publication, correlation);

describe("snapshot-only planning input", () => {
  it("UT-005 allows historical and new confirmed publications", () => {
    expect(planningEligibility(publication, "published").canStart).toBe(true);
    expect(planningEligibility(publication, "published").canStart).toBe(true);
  });
  it("UT-006 and UT-007 reject unusable or nonpublished tasks", () => {
    expect(planningEligibility(null, "published").reason).toBe("publication_required");
    expect(planningEligibility({ ...publication, issueId: "", issueNumber: 0 }, "published").canStart).toBe(false);
    expect(planningEligibility(publication, "publication_uncertain").reason).toBe("publication_required");
  });
  it("UT-012 hashes only the fixed-order retained snapshot", () => {
    const actual = input();
    const expectedHash = createHash("sha256").update(JSON.stringify({ taskId: correlation.taskId, publication: { attemptId: publication.attemptId, repositoryId: "42", repositoryNodeId: "R_42", issueId: "501", issueNumber: 5, title: "Adicionar filtro", bodyMarkdown: "## Objetivo\nFiltrar.\n" } })).digest("hex");
    expect(actual).toEqual({ protocolVersion: 1, ...correlation, inputHash: expectedHash, publication: expect.objectContaining({ bodyMarkdown: publication.bodyMarkdown }) });
    expect(JSON.stringify(actual)).not.toContain("issueUrl");
  });
  it("UT-013 accepts the exact serialized request byte budget", () => {
    const base = buildPlanningInput({ ...publication, bodyMarkdown: "x" }, correlation);
    const targetBodyBytes = 262144 - Buffer.byteLength(JSON.stringify(base)) + 1;
    const deficit = 262144 - targetBodyBytes;
    const body = "😀".repeat(65_536 - deficit).concat("中".repeat(deficit));
    const exact = buildPlanningInput({ ...publication, bodyMarkdown: body }, correlation);
    expect(Buffer.byteLength(JSON.stringify(exact))).toBe(262144);
  });
  it("UT-014 rejects overlong input without truncating the snapshot", () => {
    expect(() => buildPlanningInput({ ...publication, bodyMarkdown: "x".repeat(65_537) }, correlation)).toThrowError(new PlanningDomainError("planning_input_limit"));
    expect(() => buildPlanningInput({ ...publication, bodyMarkdown: "😀".repeat(65_536) }, correlation)).toThrowError(new PlanningDomainError("planning_input_limit"));
    expect(() => buildPlanningInput({ ...publication, title: "x".repeat(257) }, correlation)).toThrowError(new PlanningDomainError("planning_input_limit"));
    expect(() => buildPlanningInput({ ...publication, bodyMarkdown: "x".repeat(262_145) }, correlation)).toThrowError(new PlanningDomainError("planning_input_limit"));
  });
});
