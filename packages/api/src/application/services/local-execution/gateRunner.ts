import type { GateManifest } from "./gatePolicy";
import type { GateState } from "./gateSettlement";

export type GateObservation = { exitCode: number | null; timedOut: boolean; executedTests: number | null; failedTests: number | null; skippedTests: number | null; setupReason: string | null; executionId: string; checkedCheckoutDigest: string; startedAt: string; finishedAt: string | null };
export type GateOutcome = { gateId: string; attempt: number; manifestHash: string; state: GateState; reason: string | null; exitCode: number | null; executionId: string; checkedCheckoutDigest: string; startedAt: string; finishedAt: string | null };

export interface GateRunnerPorts {
  serviceAvailable(url: string): Promise<boolean>;
  environmentAvailable(name: string): boolean;
  browserAvailable(): Promise<boolean>;
  execute(input: { argv: string[]; cwd: string; timeoutMs: number; checkoutDigest: string; environmentKeys: string[] }): Promise<GateObservation>;
}

export class GateRunner {
  constructor(private readonly ports: GateRunnerPorts) {}

  async run(input: { manifest: GateManifest; gateId: string; attempt: number; checkoutDigest: string }): Promise<GateOutcome> {
    const gate = input.manifest.requiredGates.find((candidate) => candidate.id === input.gateId);
    if (!gate) return blocked(input, "gate_not_run");
    if (!(await this.servicesReady(gate.serviceUrls))) return blocked(input, "service_unavailable");
    if (!gate.environmentKeys.every((name) => this.ports.environmentAvailable(name))) return blocked(input, "environment_missing");
    if (gate.kind === "playwright" && !(await this.ports.browserAvailable())) return blocked(input, "browser_missing");
    const observation = await this.ports.execute({ argv: gate.argv, cwd: gate.cwd, timeoutMs: gate.timeoutMs, checkoutDigest: input.checkoutDigest, environmentKeys: gate.environmentKeys });
    return classify(input, gate.kind, observation);
  }

  private async servicesReady(urls: string[]) {
    for (const url of urls) if (!(await this.ports.serviceAvailable(url))) return false;
    return true;
  }
}

function classify(input: { manifest: GateManifest; gateId: string; attempt: number }, kind: "command" | "playwright", result: GateObservation): GateOutcome {
  const base = { gateId: input.gateId, attempt: input.attempt, manifestHash: input.manifest.hash, exitCode: result.exitCode, executionId: result.executionId, checkedCheckoutDigest: result.checkedCheckoutDigest, startedAt: result.startedAt, finishedAt: result.finishedAt };
  if (result.timedOut) return { ...base, state: "unknown", reason: "gate_timeout" };
  if (result.setupReason) return { ...base, state: "blocked", reason: result.setupReason };
  if (kind === "playwright" && result.exitCode === 0 && result.executedTests === 0) return { ...base, state: "blocked", reason: "gate_not_run" };
  if (kind === "command" && result.exitCode === 0) return { ...base, state: "passed", reason: null };
  if (result.exitCode === 0 && result.failedTests === 0 && result.skippedTests === 0) return { ...base, state: "passed", reason: null };
  if (result.failedTests && result.failedTests > 0) return { ...base, state: "failed", reason: "assertion_failed" };
  if (result.exitCode !== 0) return { ...base, state: "failed", reason: "command_failed" };
  return { ...base, state: "blocked", reason: "gate_not_run" };
}

function blocked(input: { manifest: GateManifest; gateId: string; attempt: number }, reason: string): GateOutcome {
  return { gateId: input.gateId, attempt: input.attempt, manifestHash: input.manifest.hash, state: "blocked", reason, exitCode: null, executionId: "", checkedCheckoutDigest: "", startedAt: "", finishedAt: null };
}
