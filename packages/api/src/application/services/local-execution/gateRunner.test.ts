import { describe, expect, it, vi } from "vitest";
import { resolveGateManifest } from "./gatePolicy";
import { GateRunner, type GateObservation, type GateRunnerPorts } from "./gateRunner";

const digest = "a".repeat(64);

describe("GateRunner", () => {
  it("UT-061 and UT-069 block gates when local services are unavailable", async () => {
    const runner = new GateRunner(ports({ serviceAvailable: vi.fn(async () => false) }));
    await expect(runner.run({ manifest: manifest("command", ["http://127.0.0.1:4317/health"]), gateId: "e2e", attempt: 1, checkoutDigest: digest })).resolves.toMatchObject({ state: "blocked", reason: "service_unavailable" });
  });

  it("UT-068 reports missing Playwright browsers as setup blockage", async () => {
    const runner = new GateRunner(ports({ browserAvailable: vi.fn(async () => false) }));
    await expect(runner.run({ manifest: manifest("playwright"), gateId: "e2e", attempt: 1, checkoutDigest: digest })).resolves.toMatchObject({ state: "blocked", reason: "browser_missing" });
  });

  it("UT-140 blocks a gate when its declared environment key is unavailable", async () => {
    const runner = new GateRunner(ports({ environmentAvailable: () => false }));
    await expect(runner.run({ manifest: manifest("command", [], ["FLOW_TEST_TOKEN"]), gateId: "e2e", attempt: 1, checkoutDigest: digest })).resolves.toMatchObject({ state: "blocked", reason: "environment_missing" });
  });

  it("UT-136 passes only when the current reporter proves executed tests", async () => {
    const runner = new GateRunner(ports({ execute: vi.fn(async () => observation({ exitCode: 0, executedTests: 2 })) }));
    await expect(runner.run({ manifest: manifest("playwright"), gateId: "e2e", attempt: 1, checkoutDigest: digest })).resolves.toMatchObject({ state: "passed", executionId: "exec-1" });
  });

  it("UT-137 distinguishes assertion failure from setup failure", async () => {
    const runner = new GateRunner(ports({ execute: vi.fn(async () => observation({ exitCode: 1, failedTests: 1 })) }));
    await expect(runner.run({ manifest: manifest("playwright"), gateId: "e2e", attempt: 1, checkoutDigest: digest })).resolves.toMatchObject({ state: "failed", reason: "assertion_failed" });
  });

  it("UT-138 blocks empty test suites", async () => {
    const runner = new GateRunner(ports({ execute: vi.fn(async () => observation({ exitCode: 0, executedTests: 0 })) }));
    await expect(runner.run({ manifest: manifest("playwright"), gateId: "e2e", attempt: 1, checkoutDigest: digest })).resolves.toMatchObject({ state: "blocked", reason: "gate_not_run" });
  });

  it("UT-141 blocks an absent runner dependency without claiming an assertion failure", async () => {
    const runner = new GateRunner(ports({ execute: vi.fn(async () => observation({ exitCode: null, setupReason: "dependency_missing" })) }));
    await expect(runner.run({ manifest: manifest("playwright"), gateId: "e2e", attempt: 1, checkoutDigest: digest })).resolves.toMatchObject({ state: "blocked", reason: "dependency_missing" });
  });

  it("UT-144 blocks a required test that the reporter unexpectedly skipped", async () => {
    const runner = new GateRunner(ports({ execute: vi.fn(async () => observation({ exitCode: 0, executedTests: 1, skippedTests: 1 })) }));
    await expect(runner.run({ manifest: manifest("playwright"), gateId: "e2e", attempt: 1, checkoutDigest: digest })).resolves.toMatchObject({ state: "blocked", reason: "gate_not_run" });
  });

  it("UT-142 and UT-143 distinguish failed commands and unknown timeouts", async () => {
    const failed = new GateRunner(ports({ execute: vi.fn(async () => observation({ exitCode: 2 })) }));
    const timeout = new GateRunner(ports({ execute: vi.fn(async () => observation({ exitCode: null, timedOut: true })) }));
    await expect(failed.run({ manifest: manifest("command"), gateId: "e2e", attempt: 1, checkoutDigest: digest })).resolves.toMatchObject({ state: "failed", reason: "command_failed" });
    await expect(timeout.run({ manifest: manifest("command"), gateId: "e2e", attempt: 1, checkoutDigest: digest })).resolves.toMatchObject({ state: "unknown", reason: "gate_timeout" });
  });
});

function manifest(kind: "command" | "playwright", serviceUrls: string[] = [], environmentKeys: string[] = []) {
  return resolveGateManifest({ actionKind: "implementation", declarations: [{ id: "e2e", label: "E2E", argv: ["pnpm", "test:e2e"], cwd: ".", sourcePath: "AGENTS.md", sourceText: "E2E required", kind, serviceUrls, environmentKeys }] });
}

function ports(overrides: Partial<GateRunnerPorts> = {}): GateRunnerPorts {
  return { serviceAvailable: async () => true, environmentAvailable: () => true, browserAvailable: async () => true, execute: async () => observation({}), ...overrides };
}

function observation(overrides: Partial<GateObservation>): GateObservation {
  return { exitCode: 0, timedOut: false, executedTests: 2, failedTests: 0, skippedTests: 0, setupReason: null, executionId: "exec-1", checkedCheckoutDigest: digest, startedAt: "2026-10-07T10:00:00.000Z", finishedAt: "2026-10-07T10:00:01.000Z", ...overrides };
}
