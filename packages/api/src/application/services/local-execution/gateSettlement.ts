import type { GateManifest } from "./gatePolicy";

export type GateState = "passed" | "failed" | "blocked" | "unrun" | "unknown";
export type GateResult = { runId: string; gateId: string; attempt: number; manifestHash: string; state: GateState; reason: string | null; checkedCheckoutDigest: string };

export function settleGates(input: { runId: string; manifest: GateManifest; results: GateResult[]; runtimeSucceeded: boolean; artifactsSafe: boolean; finalCheckoutDigest: string }) {
  if (!input.runtimeSucceeded || !input.artifactsSafe) return { state: "failed" as const, reason: input.artifactsSafe ? "runtime_failed" : "artifact_unsafe" };
  if (input.manifest.requiredGates.length === 0) return { state: "succeeded" as const, reason: "none_required" };
  for (const gate of input.manifest.requiredGates) {
    const candidates = input.results.filter((candidate) => candidate.runId === input.runId && candidate.gateId === gate.id).sort((left, right) => right.attempt - left.attempt);
    const result = candidates.find((candidate) => candidate.manifestHash === input.manifest.hash);
    if (!result) return { state: "blocked" as const, reason: candidates.length ? "gate_policy_changed" : "gate_not_run" };
    if (result.checkedCheckoutDigest !== input.finalCheckoutDigest) return { state: "blocked" as const, reason: "preparation_changed" };
    if (result.state !== "passed") return { state: result.state === "failed" ? "failed" as const : "blocked" as const, reason: result.reason ?? result.state };
  }
  return { state: "succeeded" as const, reason: null };
}
