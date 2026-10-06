import { describe, expect, it } from "vitest";
import { specApprovalGate } from "./specApprovalGate";
import { buildSections, prdRequirement, reviewVersionState } from "./specReviewModel";
import { mayDelete } from "./specRetention";
import { specPackageDiff } from "./specPackageDiff";
import { validateSpecGraph } from "./validateSpecGraph";
import { validateTestOwnership } from "./validateTestOwnership";

const ref = { documentPath: "a.md", startByte: 0, endByte: 1, sourceHash: "a".repeat(64) };
const task = (id: string, dependsOn: string[] = [], testIds: string[] = []) => ({ id, title: id, path: `${id}.md`, dependsOn, testIds, scope: ref, acceptance: ref });
const test = (id: string, tier: "task-required" | "feature-gate" | "qa-release", extra: { ownerTaskId?: string; gateOwner?: string } = {}) => ({ id, tier, source: ref, references: [], ...extra });
const gate = { captureState: "review_ready", diagnostics: [], openBlockingDecisions: [], pendingInteractions: 0, undeliveredResponses: 0, activeAttempt: false, unresolvedFinalization: false };

describe("validateSpecGraph", () => {
  it("UT-023 validates task_02 depending on task_01 when both files exist", () => {
    expect(validateSpecGraph([task("task_01"), task("task_02", ["task_01"])], ["task_01.md", "task_02.md"])).toEqual([]);
  });
  it("UT-024 reports a duplicated task identity", () => {
    expect(validateSpecGraph([task("task_01"), task("task_01")], ["task_01.md"]).map((item) => item.code)).toContain("duplicate_task");
  });
  it("IT-071 identifies both tasks of a dependency cycle", () => {
    const [cycle] = validateSpecGraph([task("task_01", ["task_02"]), task("task_02", ["task_01"])], ["task_01.md", "task_02.md"]);
    expect(cycle).toMatchObject({ code: "dependency_cycle" });
    expect(cycle!.message).toContain("task_01");
    expect(cycle!.message).toContain("task_02");
  });
});

describe("validateTestOwnership", () => {
  it("UT-025 validates a task-required test assigned once", () => {
    expect(validateTestOwnership([test("UT-001", "task-required")], [task("task_01", [], ["UT-001"])], true)).toEqual([]);
  });
  it("UT-026 reports contradictory owners", () => {
    const owners = [task("task_01", [], ["UT-001"]), task("task_02", [], ["UT-001"])];
    expect(validateTestOwnership([test("UT-001", "task-required")], owners, true)[0]).toMatchObject({ code: "contradictory_test_owner" });
  });
  it("accepts gates with an owner and tests without ownership before the Tasks stage", () => {
    expect(validateTestOwnership([test("IT-001", "feature-gate", { gateOwner: "rota" }), test("UT-001", "task-required")], [], false)).toEqual([]);
  });
});

describe("specApprovalGate", () => {
  it("UT-035 permits approval with only an observation and a complete package", () => {
    const observation = { code: "raw_html_inert", severity: "observation" as const, documentId: null, blockId: null, message: "x" };
    expect(specApprovalGate({ ...gate, diagnostics: [observation] })).toEqual([]);
  });
  it("UT-036 blocks approval for an unresolved blocking decision", () => {
    expect(specApprovalGate({ ...gate, openBlockingDecisions: ["D1"] })).toEqual([expect.objectContaining({ reason: "decision_blocked" })]);
  });
  it("IT-235 returns the specific blocker for a pending question, an undelivered response and an unresolved capture", () => {
    expect(specApprovalGate({ ...gate, pendingInteractions: 1 })[0]!.reason).toBe("attempt_active");
    expect(specApprovalGate({ ...gate, undeliveredResponses: 1 })[0]!.reason).toBe("outcome_unknown");
    expect(specApprovalGate({ ...gate, unresolvedFinalization: true })[0]!.reason).toBe("package_incomplete");
    expect(specApprovalGate({ ...gate, captureState: "prepared" })[0]!.reason).toBe("package_incomplete");
  });
});

describe("review model and retention", () => {
  it("UT-077 retains a complete captured package after 31 days and UT-078 keeps diagnostics until capture completes", () => {
    const captured = new Date("2026-09-01T00:00:00Z");
    const now = new Date("2026-10-02T00:00:00Z");
    expect(mayDelete({ kind: "package", capturedAt: captured, captureComplete: true }, now)).toBe(false);
    expect(mayDelete({ kind: "runtime_diagnostic", capturedAt: captured, captureComplete: false }, now)).toBe(false);
    expect(mayDelete({ kind: "runtime_diagnostic", capturedAt: captured, captureComplete: true }, now)).toBe(true);
    expect(mayDelete({ kind: "runtime_diagnostic", capturedAt: new Date("2026-09-20T00:00:00Z"), captureComplete: true }, now)).toBe(false);
  });
  it("IT-055 and IT-075 label a viewed older version historical and disable its approval", () => {
    const v1 = { packageId: "V1", manifestHash: "a".repeat(64) };
    expect(reviewVersionState(v1, { packageId: "V2", manifestHash: "b".repeat(64) })).toEqual({ historical: true, approvalEnabled: false });
    expect(reviewVersionState(v1, v1)).toEqual({ historical: false, approvalEnabled: true });
  });
  it("IT-058 shows the PRD as unnecessary on the TechSpec route", () => {
    expect(prdRequirement("tech_spec")).toBe("unnecessary");
    expect(prdRequirement("prd")).toBe("required");
  });
  it("diffs captured blocks and documents", () => {
    const block = (hash: string) => ({ id: "b", documentId: "d", sourceHash: hash, startByte: 0, endByte: 1, kind: "prose" as const, content: "x" });
    const diff = specPackageDiff([{ path: "a.md", blocks: [block("1")] }, { path: "gone.md", blocks: [block("1")] }], [{ path: "a.md", blocks: [block("2"), block("3")] }, { path: "new.md", blocks: [block("1")] }]);
    expect(diff).toEqual({ addedDocuments: ["new.md"], removedDocuments: ["gone.md"], changedDocuments: ["a.md"], addedBlocks: 2, removedBlocks: 1, changedBlocks: 1 });
    expect(buildSections([], [])).toEqual([]);
  });
});
