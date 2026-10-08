import { describe, expect, it } from "vitest";
import { buildSourcePlanningInput } from "./planningSourceInput";
import type { PlanningSource } from "./planningSourceInput";
import { PLANNING_REQUEST_MAX_BYTES } from "./planningLimits";

const correlation = { operationId: "o", executionId: "e", taskId: "t" };
const source: PlanningSource = { snapshotId: "S1", repositoryId: "101", repositoryNodeId: "R1", issueNodeId: "I1", issueNumber: 41, title: "Implement CSV export", bodyMarkdown: "Implement CSV export." };
const limit = (overrides: Partial<PlanningSource>) => () => buildSourcePlanningInput({ ...source, ...overrides }, correlation);

describe("buildSourcePlanningInput", () => {
  it("UT-099 carries the immutable snapshot identity and exact verified issue fields", () => {
    const input = buildSourcePlanningInput(source, correlation);
    expect(input).toMatchObject({ protocolVersion: 1, ...correlation, publication: { attemptId: "S1", issueNumber: 41, title: "Implement CSV export", bodyMarkdown: "Implement CSV export." } });
    expect(input.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(buildSourcePlanningInput(source, correlation).inputHash).toBe(input.inputHash);
    expect(buildSourcePlanningInput({ ...source, bodyMarkdown: "Implement JSON export." }, correlation).inputHash).not.toBe(input.inputHash);
  });

  it("UT-033 rejects a title above 256 code points without truncating it", () => {
    expect(limit({ title: "𝒳".repeat(257) })).toThrow("planning_input_limit");
    expect(limit({ title: "𝒳".repeat(256) })).not.toThrow();
  });

  it("UT-095 rejects a blank body or title", () => {
    expect(limit({ bodyMarkdown: " \n\t " })).toThrow("planning_input_limit");
    expect(limit({ title: "   " })).toThrow("planning_input_limit");
  });

  it("UT-096 accepts a 256 code point title and a 65536 code point body inside the request limit", () => {
    expect(limit({ title: "t".repeat(256), bodyMarkdown: "b".repeat(65_536) })).not.toThrow();
    expect(limit({ bodyMarkdown: "b".repeat(65_537) })).toThrow("planning_input_limit");
  });

  it("UT-097 rejects a body within the code point limit whose encoded request exceeds 256 KiB", () => {
    expect(limit({ bodyMarkdown: "𝒳".repeat(65_536) })).toThrow("planning_input_limit");
    expect(limit({ bodyMarkdown: "𝒳".repeat(40_000) })).not.toThrow();
    expect(Buffer.byteLength(JSON.stringify(buildSourcePlanningInput({ ...source, bodyMarkdown: "𝒳".repeat(40_000) }, correlation)))).toBeLessThanOrEqual(PLANNING_REQUEST_MAX_BYTES);
  });
});
