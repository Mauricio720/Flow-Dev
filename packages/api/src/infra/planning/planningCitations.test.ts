import { describe, expect, it } from "vitest";
import { allowedSourceIds, citesOnlyRetrievedSources } from "./planningCitations";
import type { ModelAssessment } from "./planningOutputSchema";

const EVIDENCE = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function assessment(sourceIds: string[]): ModelAssessment {
  return { route: "TECH_SPEC", complexity: "MEDIUM", summary: "s", reasons: [{ code: "X", label: "l", description: null, sourceIds }], uncertainties: [] };
}

describe("planning citations", () => {
  it("allows the issue and the evidence of calls that finished with data", () => {
    const ids = allowedSourceIds([{ toolCallId: "a", status: "done", evidenceIds: [EVIDENCE], durationMs: 1 }, { toolCallId: "b", status: "empty", evidenceIds: [OTHER], durationMs: 1 }, { toolCallId: "c", status: "unavailable", evidenceIds: [], durationMs: 1 }]);
    expect([...ids].sort()).toEqual([EVIDENCE, "issue"].sort());
  });

  it("accepts reasons that cite only the issue or retrieved evidence", () => {
    const calls = [{ toolCallId: "a", status: "done" as const, evidenceIds: [EVIDENCE], durationMs: 1 }];
    expect(citesOnlyRetrievedSources(assessment(["issue", EVIDENCE]), calls)).toBe(true);
    expect(citesOnlyRetrievedSources(assessment([OTHER]), calls)).toBe(false);
  });
});
