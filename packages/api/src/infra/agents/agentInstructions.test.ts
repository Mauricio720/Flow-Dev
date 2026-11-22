import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadInstructions } from "./agentInstructions";

const MAX_ARGUMENT_BYTES = 100 * 1024;

describe("agent instructions", () => {
  it("V-01d joins the rules, skill, boundaries and examples for the Issue Author", () => {
    const text = loadInstructions("issue_author");
    expect(text).toContain("You are the Issue Author");
    expect(text).toContain("# Create GitHub Issue");
    expect(text).toContain("## Boundaries");
    expect(text).toContain("## Examples");
    expect(text).toContain('"status":"needs_clarification"');
  });

  it("V-01d throws at startup when an instruction file is missing", () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), "agent-resources-"));
    expect(() => loadInstructions("issue_author", emptyRoot)).toThrow(/ENOENT/);
    expect(() => loadInstructions("planning", emptyRoot)).toThrow(/ENOENT/);
  });

  it("V-01d joins only the rules and the skill for planning", () => {
    const text = loadInstructions("planning");
    expect(text).toContain("You assess one published GitHub Issue");
    expect(text).toContain("# Determine Spec Path");
    expect(text).toContain('"route":"DIRECT"|"TECH_SPEC"|"PRD"');
    expect(text).not.toContain("## Origin");
  });

  it("never points at the Mastra skill loader or at reference files that are not part of the text", () => {
    for (const agent of ["issue_author", "planning"] as const) {
      const text = loadInstructions(agent);
      expect(text).not.toContain("references/");
      expect(text).not.toContain("GITHUB_REPOSITORY");
    }
  });

  it("stays well under the size limit of a single command line argument", () => {
    for (const agent of ["issue_author", "planning"] as const) expect(Buffer.byteLength(loadInstructions(agent))).toBeLessThan(MAX_ARGUMENT_BYTES);
  });
});
