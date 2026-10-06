import { vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskSpecAttempts } from "../src/infra/database/schema";
import { DrizzleTaskSpecWorkerDao } from "../src/infra/database/dao/spec/drizzleTaskSpecWorkerDao";
import { SpecWorkerController } from "../src/controllers/specWorkerController";
import type { SpecWorkerDeps } from "../src/controllers/specWorkerTypes";
import { SpecRuntimeError } from "../src/infra/spec/compozy/compozyErrors";
import { COMPOZY_PIN } from "../src/application/spec/specPins";
import type { RuntimeStop } from "../src/application/spec/specRuntimeGateway";
import { SpecCaptureService } from "../src/application/services/spec/specCaptureService";
import { DrizzleTaskSpecCaptureDao } from "../src/infra/database/dao/spec/drizzleTaskSpecCaptureDao";
import { SpecFinalizationService } from "../src/application/services/spec/specFinalizationService";
import { DrizzleTaskSpecApprovalDao } from "../src/infra/database/dao/spec/drizzleTaskSpecApprovalDao";
import { DrizzleTaskSpecFinalizationDao } from "../src/infra/database/dao/spec/drizzleTaskSpecFinalizationDao";
import type { SpecSetup } from "./spec-support";

export const pins = { version: COMPOZY_PIN.version, openApiSha256: COMPOZY_PIN.openApiSha256, binarySha256: COMPOZY_PIN.binarySha256, bundleSha256: "b".repeat(64) };
export const NOW = new Date("2026-10-05T10:00:00Z");

export function fakeDeps(setup: SpecSetup, overrides: Partial<SpecWorkerDeps> = {}) {
  const calls: string[] = [];
  const track = <T>(name: string, value: T) => vi.fn(async () => { calls.push(name); return value; });
  const runtime = {
    preflight: track("preflight", { version: "", schemaVersion: "1", permissions: "approve-reads", provider: "p", definitionDigest: "d" }),
    create: track("create", { workspaceId: "w1", sessionId: "s1", name: "n" }),
    submit: track("submit", { status: "accepted" as const, messageId: "m", idempotencyKey: "k", turnId: "turn-1", replayed: false }),
    inspect: track("inspect", { state: "active" as const, verified: false, stopReason: null, stopCause: null, turnId: null, attention: null, pendingInteractions: [] }),
    events: vi.fn(() => (async function* () { yield* []; })()), interactions: track("interactions", []), resolve: track("resolve", {}), stop: track("stop", { state: "stopping", verified: false, cause: null, attention: null, settled: false, canceled: false } as RuntimeStop),
  };
  const workspaces = {
    prepare: vi.fn(async (input: { taskId: string }) => { calls.push("prepare"); return { slug: `flow-${input.taskId}`, checkoutPath: "/tmp/checkout", baseCommit: "a".repeat(40) }; }),
    candidate: track("candidate", { candidatePath: "/tmp/c", inputsPath: "/tmp/i", scratchPath: "/tmp/s", snapshotPath: "/tmp/n" }),
    freeze: vi.fn(), inspect: vi.fn(), promote: vi.fn(), verify: track("verify", { entries: [], manifestHash: "c".repeat(64) }),
  };
  const launcher = { socketPath: (id: string) => `/run/${id}.sock`, start: vi.fn(async () => { calls.push("launch"); return { socketPath: "/run/x.sock" }; }), stop: vi.fn(async () => undefined) };
  const access = { check: vi.fn(async () => "granted" as const), credential: vi.fn(async () => ({ username: "u", password: "p" })), repository: vi.fn(async () => ({ owner: "acme", name: "private", nodeId: "R_202" })) };
  const deps: SpecWorkerDeps = { dao: new DrizzleTaskSpecWorkerDao(setup.database), runtime, workspaces, launcher, access, upstream: async () => [], approvals: new DrizzleTaskSpecApprovalDao(setup.database), capture: new SpecCaptureService(new DrizzleTaskSpecCaptureDao(setup.database)), finalization: new SpecFinalizationService(new DrizzleTaskSpecFinalizationDao(setup.database), workspaces as never), snapshot: track("snapshot", undefined), settings: { runnerId: "runner-1", maxActive: 2, agentName: "flow-spec", provider: "p", model: "m", runtime: { agentName: "flow-spec", provider: "p", model: "m", declared: pins, accepted: pins }, workspaceRoot: "/srv/spec" }, owner: "worker-a", clock: () => NOW, ...overrides };
  return { deps, controller: new SpecWorkerController(deps), calls, runtime, workspaces, launcher, access };
}

export const attemptRow = async (setup: SpecSetup) => (await setup.database.select().from(taskSpecAttempts))[0]!;
export const failWith = (reason: string, uncertain = false) => { throw new SpecRuntimeError(reason as never, uncertain); };
export async function setAttempt(setup: SpecSetup, patch: Partial<typeof taskSpecAttempts.$inferInsert>) {
  await setup.database.update(taskSpecAttempts).set(patch).where(eq(taskSpecAttempts.id, (await attemptRow(setup)).id));
}
