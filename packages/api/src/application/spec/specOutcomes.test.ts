import { describe, expect, it } from "vitest";
import { mapResolution, mapStop } from "./specRuntimeOutcomes";
import { classifyPermission } from "./specPermissionBoundary";
import { installedManifestHash, stageManifestHash } from "./specManifest";
import { buildRetryContext } from "./specRetryContext";
import { assertUpstreamPackages, buildSpecInput, sealSpecInput } from "../services/spec/specInput";
import { isBoundedSpecText } from "../services/spec/specTextRules";

const entry = (path: string, sha256: string) => ({ path, role: "doc", sha256, bytes: 1 });
const manifest = (entries: ReturnType<typeof entry>[]) => stageManifestHash({ stage: "tech_spec", bundleVersion: "1", schemaVersion: 1, upstream: [], entries });

describe("runtime outcomes", () => {
  it("UT-063 maps resolved-after-restart to an orphaned historical resolution", () => {
    expect(mapResolution("resolved-after-restart")).toMatchObject({ outcome: "resolved_after_restart", delivered: false, orphaned: true, liveDeliveryProven: false });
  });
  it("UT-064 never reports delivery for an unknown outcome", () => {
    expect(mapResolution("something-new")).toMatchObject({ outcome: "unknown", delivered: false, reason: "outcome_unknown" });
  });
  it("UT-065 maps a verified user cancellation to a confirmed cancel", () => {
    expect(mapStop({ state: "stopped", verified: true, stopReason: "user_canceled" })).toMatchObject({ settled: true, canceled: true });
  });
  it("UT-066 keeps an unverified stopping state nonterminal", () => {
    expect(mapStop({ state: "stopping", verified: false })).toMatchObject({ settled: false, canceled: false });
    expect(mapStop({ state: "stopped", verified: false, stopReason: "user_canceled" }).settled).toBe(false);
  });
});

describe("manifests and limits", () => {
  it("UT-067 yields a stable stage manifest hash regardless of entry order", () => {
    expect(manifest([entry("b.md", "2"), entry("a.md", "1")])).toBe(manifest([entry("a.md", "1"), entry("b.md", "2")]));
    expect(installedManifestHash([entry("a.md", "1")])).toMatch(/^[0-9a-f]{64}$/);
  });
  it("UT-068 changes the hash when one companion byte changes", () => {
    expect(manifest([entry("a.md", "1")])).not.toBe(manifest([entry("a.md", "2")]));
  });
  it("UT-069 accepts exactly 16,384 UTF-8 bytes", () => {
    expect(isBoundedSpecText("a".repeat(16_384))).toBe(true);
    expect(isBoundedSpecText("é".repeat(8_192))).toBe(true);
  });
  it("UT-070 rejects 16,385 UTF-8 bytes and blank text", () => {
    expect(isBoundedSpecText("a".repeat(16_385))).toBe(false);
    expect(isBoundedSpecText("é".repeat(8_192) + "a")).toBe(false);
    expect(isBoundedSpecText("   ")).toBe(false);
  });
});

describe("permission boundary and retry context", () => {
  it("UT-073 classifies a write to the current stage document as in scope", () => {
    expect(classifyPermission({ tool: "write", path: "_techspec.md" }, { stage: "tech_spec" })).toBe("in_scope");
    expect(classifyPermission({ tool: "read", path: "src/index.ts" }, { stage: "tech_spec" })).toBe("in_scope");
  });
  it("UT-074 classifies git push and source writes as out of scope", () => {
    expect(classifyPermission({ tool: "bash", command: "git push origin main" }, { stage: "tech_spec" })).toBe("permission_out_of_scope");
    expect(classifyPermission({ tool: "write", path: "src/index.ts" }, { stage: "tech_spec" })).toBe("permission_out_of_scope");
    expect(classifyPermission({ tool: "write", path: "../_prd.md" }, { stage: "tech_spec" })).toBe("permission_out_of_scope");
    expect(classifyPermission({ tool: "write", path: "_prd.md" }, { stage: "tech_spec" })).toBe("permission_out_of_scope");
  });
  const source = buildSpecInput({ taskId: "t", projectId: "p", stage: "tech_spec", publicationId: "pub", planningDecisionId: "d", selectedRoute: "prd", repositoryGithubId: "202", publication: { issueNumber: 42, title: "T", bodyMarkdown: "B" }, planningUncertainties: [], upstreamPackageIds: ["prd-1"] });
  it("UT-075 retains saved answers and reviewed inputs in the next attempt", () => {
    const context = buildRetryContext({ input: source, answers: [{ interactionId: "Q1", question: "Prazo?", answer: "Thirty days" }], permissions: [], adjustment: null, reviewedPackageIds: ["V1"] });
    expect(context).toMatchObject({ answers: [{ interactionId: "Q1" }], reviewedPackageIds: ["V1"] });
  });
  it("UT-076 never carries a previous permission grant into executable context", () => {
    const context = buildRetryContext({ input: source, answers: [], permissions: [{ interactionId: "Pm1", decision: "allow_once", actionDigest: "a".repeat(64) }], adjustment: null, reviewedPackageIds: [] });
    expect(context.executablePermissions).toEqual([]);
    expect(context.permissionHistory).toHaveLength(1);
  });
  it("UT-029 yields the same sealed context hash for the same retained facts", () => {
    expect(sealSpecInput(source, "a".repeat(40)).contextHash).toBe(sealSpecInput({ ...source }, "a".repeat(40)).contextHash);
    expect(sealSpecInput(source, "b".repeat(40)).contextHash).not.toBe(sealSpecInput(source, "a".repeat(40)).contextHash);
  });
  it("UT-030 requires the approved upstream package for the PRD route", () => {
    expect(() => assertUpstreamPackages({ ...source, upstreamPackageIds: [] })).toThrow(expect.objectContaining({ reason: "stage_prerequisite" }));
    expect(() => assertUpstreamPackages(source)).not.toThrow();
  });
});
