import { describe, expect, it } from "vitest";
import { buildSpecInput, specInputHash } from "./specInput";
import { specPayloadHash } from "./specPayload";

describe("spec payload hashing", () => {
  it("UT-031 hashes equivalent payloads identically regardless of key order", () => {
    const first = specPayloadHash("spec.adjust", { text: "mudar", stage: "prd" });
    expect(specPayloadHash("spec.adjust", { stage: "prd", text: "mudar" })).toBe(first);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("UT-032 changes the hash when the action or any payload field changes", () => {
    const first = specPayloadHash("spec.adjust", { text: "mudar" });
    expect(specPayloadHash("spec.adjust", { text: "mudar mais" })).not.toBe(first);
    expect(specPayloadHash("spec.answer", { text: "mudar" })).not.toBe(first);
  });
});

describe("SpecInput assembly", () => {
  const source = { taskId: "t", projectId: "p", stage: "prd" as const, publicationId: "pub", planningDecisionId: "d", selectedRoute: "prd" as const, repositoryGithubId: "202", publication: { issueNumber: 42, title: "Original", bodyMarkdown: "Corpo" }, planningUncertainties: ["Falta contexto"] };

  it("IT-009 retains the published snapshot and planning uncertainties verbatim", () => {
    const input = buildSpecInput(source);
    expect(input).toMatchObject({ publication: source.publication, planningUncertainties: ["Falta contexto"], commitSha: null, selectedRoute: "prd", decisionIds: [] });
    expect(specInputHash(input)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes the context hash when retained context changes", () => {
    expect(buildSpecInput({ ...source, planningUncertainties: [] }).contextHash).not.toBe(buildSpecInput(source).contextHash);
  });
});
