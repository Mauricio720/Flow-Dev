import { describe, expect, it } from "vitest";
import { resolveGateManifest } from "./gatePolicy";
import { settleGates } from "./gateSettlement";

const manifest = resolveGateManifest({ actionKind: "implementation", declarations: [{ id: "lint", label: "Lint", argv: ["pnpm", "lint"], cwd: ".", sourcePath: "AGENTS.md", sourceText: "Required gate: pnpm lint", kind: "command" }] });
const digest = "b".repeat(64);

describe("settleGates", () => {
  it("UT-060 returns none_required for gate-free actions", () => {
    const empty = resolveGateManifest({ actionKind: "review", declarations: [] });
    expect(settleGates({ runId: "run", manifest: empty, results: [], runtimeSucceeded: true, artifactsSafe: true, finalCheckoutDigest: digest })).toEqual({ state: "succeeded", reason: "none_required" });
  });

  it("UT-071 and UT-145 require a current passed result on the final checkout", () => {
    const result = { runId: "run", gateId: "lint", attempt: 2, manifestHash: manifest.hash, state: "passed" as const, reason: null, checkedCheckoutDigest: digest };
    expect(settleGates({ runId: "run", manifest, results: [{ ...result, attempt: 1 }, { ...result, attempt: 2, state: "unknown", reason: "gate_timeout" }], runtimeSucceeded: true, artifactsSafe: true, finalCheckoutDigest: digest })).toMatchObject({ state: "blocked", reason: "gate_timeout" });
    expect(settleGates({ runId: "run", manifest, results: [result], runtimeSucceeded: true, artifactsSafe: true, finalCheckoutDigest: digest })).toMatchObject({ state: "succeeded", reason: null });
  });

  it("UT-147 and UT-148 block stale policy or checkout results", () => {
    const stale = { runId: "run", gateId: "lint", attempt: 1, manifestHash: "a".repeat(64), state: "passed" as const, reason: null, checkedCheckoutDigest: digest };
    expect(settleGates({ runId: "run", manifest, results: [stale], runtimeSucceeded: true, artifactsSafe: true, finalCheckoutDigest: digest })).toMatchObject({ state: "blocked", reason: "gate_policy_changed" });
    expect(settleGates({ runId: "run", manifest, results: [{ ...stale, manifestHash: manifest.hash }], runtimeSucceeded: true, artifactsSafe: true, finalCheckoutDigest: "c".repeat(64) })).toMatchObject({ state: "blocked", reason: "preparation_changed" });
  });

  it("UT-146 refuses success when a required gate is still unrun", () => {
    expect(settleGates({ runId: "run", manifest, results: [], runtimeSucceeded: true, artifactsSafe: true, finalCheckoutDigest: digest })).toMatchObject({ state: "blocked", reason: "gate_not_run" });
  });

  it("UT-149 does not pass unrun gates for a canceled action", () => {
    expect(settleGates({ runId: "run", manifest, results: [], runtimeSucceeded: false, artifactsSafe: true, finalCheckoutDigest: digest })).toMatchObject({ state: "failed", reason: "runtime_failed" });
  });
});
