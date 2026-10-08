import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { localPayloadHash } from "../../application/services/local-execution/localHash";
import type { LocalCommand } from "../../application/services/local-execution/localProtocol";
import { LocalCommandJournal } from "./localCommandJournal";
import { checkoutState, LocalNativeCommandAgent, resolveLocalGateManifest } from "./localNativeCommandAgent";
import { PrivateRegistryStore } from "./privateRegistry";

const run = promisify(execFile);
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("LocalNativeCommandAgent", () => {
  it("UT-184 returns a bounded runtime_failed event when a local launch dependency fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-native-launch-failure-"));
    dirs.push(directory);
    const store = { read: async () => { throw new Error("/home/private/ENV_CANARY_123"); } } as never;
    const payload = { preparationId: "44444444-4444-4444-8444-444444444444", actionId: "plan-1", sourceSnapshotId: "66666666-6666-4666-8666-666666666666", checkoutLabel: "Flow checkout", action: { kind: "create_spec", runtime: { providerId: "codex" } } };
    const command: LocalCommand = { protocolVersion: 1, commandId: payload.preparationId, machineId: "11111111-1111-4111-8111-111111111111", projectId: "22222222-2222-4222-8222-222222222222", runId: payload.preparationId, actorId: "33333333-3333-4333-8333-333333333333", fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target: { machineId: "11111111-1111-4111-8111-111111111111", linkId: "55555555-5555-4555-8555-555555555555", linkRevision: 1, checkoutHandle: "checkout-handle" }, kind: "prepare", payloadHash: localPayloadHash(payload), payload };
    const agent = new LocalNativeCommandAgent({ store, runtimeRoot: join(directory, "runtime") });
    const [event] = await agent.handle(command, new LocalCommandJournal(join(directory, "journal.json")));
    expect(event).toMatchObject({ kind: "terminal", payload: { outcome: "failed", reason: "runtime_failed" } });
    expect(JSON.stringify(event)).not.toContain("ENV_CANARY_123");
    expect(JSON.stringify(event)).not.toContain("/home/private");
  });

  it("UT-139 rejects invalid local gate configuration syntax during preparation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-native-gate-config-"));
    dirs.push(directory);
    await mkdir(join(directory, ".flow-spec"), { recursive: true });
    await writeFile(join(directory, ".flow-spec", "local-gates.json"), "{invalid-json");
    await expect(resolveLocalGateManifest(directory, "implementation")).rejects.toMatchObject({ reason: "instructions_invalid" });
  });

  it("UT-130 rejects an incompatible pinned runtime before native submission", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-native-pin-") );
    dirs.push(directory);
    const checkout = join(directory, "checkout");
    const bin = join(directory, "bin");
    await mkdir(checkout);
    await mkdir(bin);
    await writeFile(join(checkout, "AGENTS.md"), "No mandatory gates.\n");
    await run("git", ["init", checkout]);
    await run("git", ["-C", checkout, "remote", "add", "origin", "git@github.com:acme/flow.git"]);
    await writeFile(join(bin, "compozy"), "#!/bin/sh\necho v99.0\n");
    await chmod(join(bin, "compozy"), 0o700);
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    await store.write({ version: 1, entries: [{ handle: "checkout-handle", key: "a".repeat(64), root: checkout, repository: "acme/flow", label: "Flow checkout" }] });
    const payload = { preparationId: "44444444-4444-4444-8444-444444444444", actionId: "plan-1", sourceSnapshotId: "66666666-6666-4666-8666-666666666666", checkoutLabel: "Flow checkout", action: { kind: "create_spec", runtime: { providerId: "codex" } } };
    const command: LocalCommand = { protocolVersion: 1, commandId: payload.preparationId, machineId: "11111111-1111-4111-8111-111111111111", projectId: "22222222-2222-4222-8222-222222222222", runId: payload.preparationId, actorId: "33333333-3333-4333-8333-333333333333", fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target: { machineId: "11111111-1111-4111-8111-111111111111", linkId: "55555555-5555-4555-8555-555555555555", linkRevision: 1, checkoutHandle: "checkout-handle" }, kind: "prepare", payloadHash: localPayloadHash(payload), payload };
    const agent = new LocalNativeCommandAgent({ store, runtimeRoot: join(directory, "runtime"), environment: { PATH: bin } });
    const [event] = await agent.handle(command, new LocalCommandJournal(join(directory, "journal.json")));
    expect(event).toMatchObject({ kind: "terminal", payload: { outcome: "blocked", reason: "runtime_incompatible" } });
    expect(await readFile(join(directory, "runtime", "gate-manifests", `${payload.preparationId}.json`)).catch(() => null)).toBeNull();
  });

  it.each([["UT-119", "src/index.ts"], ["UT-120", "AGENTS.md"]] as const)("%s refuses start when the prepared checkout instructions changed", async (_id, changedPath) => {
    const directory = await mkdtemp(join(tmpdir(), "flow-native-preparation-change-"));
    dirs.push(directory);
    const checkout = join(directory, "checkout");
    await mkdir(join(checkout, "src"), { recursive: true });
    await writeFile(join(checkout, "AGENTS.md"), "Follow current project instructions.\n");
    await writeFile(join(checkout, "src", "index.ts"), "export const value = 1;\n");
    await run("git", ["init", checkout]);
    await run("git", ["-C", checkout, "remote", "add", "origin", "git@github.com:acme/flow.git"]);
    const machineId = "11111111-1111-4111-8111-111111111111";
    const projectId = "22222222-2222-4222-8222-222222222222";
    const actorId = "33333333-3333-4333-8333-333333333333";
    const preparationId = "44444444-4444-4444-8444-444444444444";
    const linkId = "55555555-5555-4555-8555-555555555555";
    const target = { machineId, linkId, linkRevision: 1, checkoutHandle: "checkout-handle" };
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    await store.write({ version: 1, entries: [{ handle: target.checkoutHandle, key: "a".repeat(64), root: checkout, repository: "acme/flow", label: "Flow checkout" }] });
    const journal = new LocalCommandJournal(join(directory, "journal.json"));
    const preparePayload = { preparationId, actionId: "action-1", sourceSnapshotId: projectId, checkoutLabel: "Flow checkout", action: { kind: "create_spec", runtime: { providerId: "codex" } } };
    const prepare: LocalCommand = { protocolVersion: 1, commandId: preparationId, machineId, projectId, runId: preparationId, actorId, fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target, kind: "prepare", payload: preparePayload, payloadHash: localPayloadHash(preparePayload) };
    await journal.dispatch(prepare, async () => "prepared");
    const checkoutDigest = (await checkoutState(checkout)).digest;
    const pinnedManifest = await resolveLocalGateManifest(checkout, "create_spec");
    const manifestHash = pinnedManifest.hash;
    const runtimeRoot = join(directory, "runtime");
    await mkdir(join(runtimeRoot, "gate-manifests"), { recursive: true });
    await writeFile(join(runtimeRoot, "gate-manifests", `${preparationId}.json`), JSON.stringify(pinnedManifest));
    const preparedPayload = { preparationId, checkoutLabel: "Flow checkout", dirty: true, checkoutDigest, manifestHash, capabilities: ["git"], requiredGates: [] };
    await journal.recordEvent({ protocolVersion: 1, commandId: preparationId, runId: preparationId, fence: 1, sequence: 1, kind: "prepared", payload: preparedPayload, payloadHash: localPayloadHash(preparedPayload) });
    const changedFile = join(checkout, changedPath);
    await writeFile(changedFile, `${await readFile(changedFile, "utf8")}\nchanged after preparation\n`);
    const snapshot = { kind: "create_spec", workspace: { kind: "local", target }, operatorId: actorId, sourceSnapshotId: projectId, localPreparation: { preparationId, manifestHash, checkoutDigest, requiredGates: [] } };
    const startPayload = { preparationId, actionId: "action-1", taskId: projectId, snapshot, task: { issueNumber: 1, title: "Task", bodyMarkdown: "Details" } };
    const start: LocalCommand = { protocolVersion: 1, commandId: "66666666-6666-4666-8666-666666666666", machineId, projectId, runId: "77777777-7777-4777-8777-777777777777", actorId, fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target, kind: "start", payload: startPayload, payloadHash: localPayloadHash(startPayload) };
    const agent = new LocalNativeCommandAgent({ store, runtimeRoot });
    const [event] = await agent.handle(start, journal);
    expect(event).toMatchObject({ kind: "terminal", payload: { outcome: "blocked", reason: "preparation_changed" } });
  });

  it("UT-131 blocks a prepared create_spec when its destination artifact already exists", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-native-artifact-conflict-"));
    dirs.push(directory);
    const checkout = join(directory, "checkout");
    await mkdir(join(checkout, ".flow-spec"), { recursive: true });
    await writeFile(join(checkout, "AGENTS.md"), "Follow current project instructions.\n");
    await writeFile(join(checkout, ".flow-spec", "_spec.md"), "Existing local document\n");
    await run("git", ["init", checkout]);
    await run("git", ["-C", checkout, "remote", "add", "origin", "git@github.com:acme/flow.git"]);
    const machineId = "11111111-1111-4111-8111-111111111111";
    const projectId = "22222222-2222-4222-8222-222222222222";
    const actorId = "33333333-3333-4333-8333-333333333333";
    const preparationId = "44444444-4444-4444-8444-444444444444";
    const target = { machineId, linkId: "55555555-5555-4555-8555-555555555555", linkRevision: 1, checkoutHandle: "checkout-handle" };
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    await store.write({ version: 1, entries: [{ handle: target.checkoutHandle, key: "a".repeat(64), root: checkout, repository: "acme/flow", label: "Flow checkout" }] });
    const journal = new LocalCommandJournal(join(directory, "journal.json"));
    const preparePayload = { preparationId, actionId: "action-1", sourceSnapshotId: projectId, checkoutLabel: "Flow checkout", action: { kind: "create_spec", runtime: { providerId: "codex" } } };
    const prepare: LocalCommand = { protocolVersion: 1, commandId: preparationId, machineId, projectId, runId: preparationId, actorId, fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target, kind: "prepare", payload: preparePayload, payloadHash: localPayloadHash(preparePayload) };
    await journal.dispatch(prepare, async () => "prepared");
    const checkoutDigest = (await checkoutState(checkout)).digest;
    const pinnedManifest = await resolveLocalGateManifest(checkout, "create_spec");
    const manifestHash = pinnedManifest.hash;
    const runtimeRoot = join(directory, "runtime");
    await mkdir(join(runtimeRoot, "gate-manifests"), { recursive: true });
    await writeFile(join(runtimeRoot, "gate-manifests", `${preparationId}.json`), JSON.stringify(pinnedManifest));
    const preparedPayload = { preparationId, checkoutLabel: "Flow checkout", dirty: true, checkoutDigest, manifestHash, capabilities: ["git"], requiredGates: [] };
    await journal.recordEvent({ protocolVersion: 1, commandId: preparationId, runId: preparationId, fence: 1, sequence: 1, kind: "prepared", payload: preparedPayload, payloadHash: localPayloadHash(preparedPayload) });
    const snapshot = { kind: "create_spec", workspace: { kind: "local", target }, operatorId: actorId, sourceSnapshotId: projectId, localPreparation: { preparationId, manifestHash, checkoutDigest, requiredGates: [] } };
    const startPayload = { preparationId, actionId: "action-1", taskId: projectId, snapshot, task: { issueNumber: 1, title: "Task", bodyMarkdown: "Details" } };
    const start: LocalCommand = { protocolVersion: 1, commandId: "66666666-6666-4666-8666-666666666666", machineId, projectId, runId: "77777777-7777-4777-8777-777777777777", actorId, fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target, kind: "start", payload: startPayload, payloadHash: localPayloadHash(startPayload) };
    const agent = new LocalNativeCommandAgent({ store, runtimeRoot });
    const [event] = await agent.handle(start, journal);
    expect(event).toMatchObject({ kind: "terminal", payload: { outcome: "blocked", reason: "artifact_conflict" } });
    await expect(readFile(join(checkout, ".flow-spec", "_spec.md"), "utf8")).resolves.toBe("Existing local document\n");
  });

  it("UT-116 prepares a canonical checkout and returns only bounded readiness metadata", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-native-agent-"));
    dirs.push(directory);
    const checkout = join(directory, "checkout");
    const bin = join(directory, "bin");
    await mkdir(checkout);
    await mkdir(bin);
    await mkdir(join(checkout, ".flow-spec"));
    await mkdir(join(checkout, "packages", "api"), { recursive: true });
    await mkdir(join(checkout, ".agents", "rules"), { recursive: true });
    await writeFile(join(checkout, "AGENTS.md"), "Follow local project rules.\n");
    await writeFile(join(checkout, ".flow-spec", "AGENTS.md"), "Keep generated artifacts reviewable.\n");
    await writeFile(join(checkout, "packages", "api", "AGENTS.md"), "See [the API rule](../../.agents/rules/api.md).\nRequired gate: pnpm typecheck\n");
    await writeFile(join(checkout, ".agents", "rules", "api.md"), "Keep API changes layered.\n");
    await writeFile(join(checkout, ".flow-spec", "local-gates.json"), JSON.stringify({ gates: [{ id: "unit", label: "Unit tests", argv: ["pnpm", "test"], cwd: "packages/api", kind: "command" }] }));
    await run("git", ["init", checkout]);
    await run("git", ["-C", checkout, "remote", "add", "origin", "git@github.com:acme/flow.git"]);
    await writeFile(join(bin, "compozy"), "#!/bin/sh\necho v0.3.0-beta.29\n");
    await writeFile(join(bin, "codex"), "#!/bin/sh\nexit 0\n");
    await chmod(join(bin, "compozy"), 0o700);
    await chmod(join(bin, "codex"), 0o700);
    const machineId = "11111111-1111-4111-8111-111111111111";
    const projectId = "22222222-2222-4222-8222-222222222222";
    const actorId = "33333333-3333-4333-8333-333333333333";
    const preparationId = "44444444-4444-4444-8444-444444444444";
    const linkId = "55555555-5555-4555-8555-555555555555";
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    await store.write({ version: 1, entries: [{ handle: "checkout-handle", key: "a".repeat(64), root: checkout, repository: "acme/flow", label: "Flow checkout" }] });
    const payload = { preparationId, actionId: "plan-1", sourceSnapshotId: "66666666-6666-4666-8666-666666666666", checkoutLabel: "Flow checkout", action: { kind: "create_spec", runtime: { providerId: "codex" } } };
    const command: LocalCommand = {
      protocolVersion: 1, commandId: preparationId, machineId, projectId, runId: preparationId, actorId, fence: 1,
      leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target: { machineId, linkId, linkRevision: 1, checkoutHandle: "checkout-handle" },
      kind: "prepare", payloadHash: localPayloadHash(payload), payload,
    };
    const agent = new LocalNativeCommandAgent({ store, runtimeRoot: join(directory, "runtime"), environment: { PATH: bin }, verifyCompozyBinary: async () => true });
    const event = await agent.handle(command, new LocalCommandJournal(join(directory, "journal.json")));
    expect(event[0]).toMatchObject({ kind: "prepared", payload: { preparationId, checkoutLabel: "Flow checkout", dirty: true, requiredGates: [{ id: "pnpm-typecheck", label: "pnpm typecheck", kind: "command" }, { id: "unit", label: "Unit tests", kind: "command" }] } });
    expect(JSON.stringify(event)).not.toContain(checkout);
    expect(JSON.stringify(event)).not.toContain("pnpm test");
    const pinnedManifest = JSON.parse(await readFile(join(directory, "runtime", "gate-manifests", `${preparationId}.json`), "utf8"));
    expect(pinnedManifest).toMatchObject({ requiredGates: [{ id: "pnpm-typecheck", argv: ["pnpm", "typecheck"], cwd: "." }, { id: "unit", argv: ["pnpm", "test"], cwd: "packages/api" }] });
    expect(pinnedManifest.sources.map((source: { path: string }) => source.path)).toEqual([".agents/rules/api.md", ".flow-spec/AGENTS.md", ".flow-spec/local-gates.json", "AGENTS.md", "packages/api/AGENTS.md", "packages/api/AGENTS.md#L2"]);
  });

  it("IT-223 reports the journaled terminal state without submitting another native run", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-native-inspect-"));
    dirs.push(directory);
    const machineId = "11111111-1111-4111-8111-111111111111";
    const projectId = "22222222-2222-4222-8222-222222222222";
    const actorId = "33333333-3333-4333-8333-333333333333";
    const linkId = "55555555-5555-4555-8555-555555555555";
    const runId = "66666666-6666-4666-8666-666666666666";
    const journal = new LocalCommandJournal(join(directory, "journal.json"));
    const target = { machineId, linkId, linkRevision: 1, checkoutHandle: "checkout-handle" };
    const payload = { preparationId: "44444444-4444-4444-8444-444444444444", actionId: "action-1", taskId: projectId, snapshot: {}, task: { issueNumber: 42, title: "Task", bodyMarkdown: "Details" } };
    const start: LocalCommand = { protocolVersion: 1, commandId: "77777777-7777-4777-8777-777777777777", machineId, projectId, runId, actorId, fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target, kind: "start", payload, payloadHash: localPayloadHash(payload) };
    await journal.dispatch(start, async () => "runtime-session");
    const acceptedPayload = { runtimeExecutionId: "runtime-session", runtimeWorkspaceId: "workspace-1", runtimeSessionId: "session-1", runtimeTurnId: "turn-1" };
    await journal.recordEvent({ protocolVersion: 1, commandId: start.commandId, runId, fence: 1, sequence: 1, kind: "accepted", payload: acceptedPayload, payloadHash: localPayloadHash(acceptedPayload) });
    const terminalPayload = { outcome: "succeeded", reason: null, checkoutDigest: "a".repeat(64), artifactsSafe: true, runtimeSucceeded: true };
    await journal.recordEvent({ protocolVersion: 1, commandId: start.commandId, runId, fence: 1, sequence: 2, kind: "terminal", payload: terminalPayload, payloadHash: localPayloadHash(terminalPayload) });

    const inspectPayload = {};
    const inspect: LocalCommand = { protocolVersion: 1, commandId: "88888888-8888-4888-8888-888888888888", machineId, projectId, runId, actorId, fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target, kind: "inspect", payload: inspectPayload, payloadHash: localPayloadHash(inspectPayload) };
    const agent = new LocalNativeCommandAgent({ store: new PrivateRegistryStore(join(directory, "registry.json")), runtimeRoot: join(directory, "runtime") });
    const [event] = await agent.handle(inspect, journal);
    expect(event).toMatchObject({ kind: "activity", payload: { summary: "Local run terminal succeeded", relativeFiles: [] } });
    expect(await journal.forRun(runId)).toMatchObject({ runtimeId: "runtime-session" });
  });
});
