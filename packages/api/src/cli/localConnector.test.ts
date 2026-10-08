import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalConnectorClient } from "./localConnector";
import { PrivateRegistryStore } from "../infra/local-execution/privateRegistry";
import { LocalCheckoutRegistry } from "../infra/local-execution/localCheckoutRegistry";
import { LocalCommandJournal } from "../infra/local-execution/localCommandJournal";
import { localPayloadHash } from "../application/services/local-execution/localHash";
import type { LocalCommand, LocalEvent } from "../application/services/local-execution/localProtocol";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("LocalConnectorClient pairing", () => {
  it("IT-194 pairs through the public CLI and persists the machine token privately", async () => {
    const fixture = await publicCliFixture();
    const pair = await runPublicCli(fixture.preloadPath, fixture.env, ["pair", "--server", "https://flow.test", "--label", "Laptop"]);
    expect(pair.code).toBe(0);
    expect(pair.stdout).toContain("123456");
    expect(await fixture.store.read()).toMatchObject({ machine: { token: "private-token" } });
  });

  it("IT-200 links a real Git root through the public CLI", async () => {
    const fixture = await publicCliFixture(true);
    const link = await runPublicCli(fixture.preloadPath, fixture.env, ["link", "--project", "33333333-3333-4333-8333-333333333333", "--path", fixture.projectRoot, "--expected-revision", "0"]);
    expect(link.code).toBe(0);
    expect(JSON.parse(link.stdout.trim().split("\n").at(-1)!)).toMatchObject({ revision: 1 });
  });

  it("IT-214 keeps credential rotation out of public status output", async () => {
    const fixture = await publicCliFixture(true);
    const runId = "66666666-6666-4666-8666-666666666666";
    const commandId = "77777777-7777-4777-8777-777777777777";
    const payload = { preparationId: "44444444-4444-4444-8444-444444444444", actionId: "action-1", taskId: "33333333-3333-4333-8333-333333333333", snapshot: { kind: "create_spec" }, task: { issueNumber: 41, title: "Task", bodyMarkdown: "Details" } };
    const command: LocalCommand = { protocolVersion: 1, commandId, machineId: "11111111-1111-4111-8111-111111111111", projectId: payload.taskId, runId, actorId: "88888888-8888-4888-8888-888888888888", fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target: { machineId: "11111111-1111-4111-8111-111111111111", linkId: "55555555-5555-4555-8555-555555555555", linkRevision: 1, checkoutHandle: "private-checkout-handle" }, kind: "start", payload, payloadHash: localPayloadHash(payload) };
    const journal = new LocalCommandJournal(fixture.env.FLOW_LOCAL_JOURNAL!);
    await journal.dispatch(command, async () => "runtime-session-1");
    const eventPayload = { runtimeExecutionId: "runtime-session-1", runtimeWorkspaceId: "workspace-1", runtimeSessionId: "runtime-session-1", runtimeTurnId: null };
    const event: LocalEvent = { protocolVersion: 1, commandId, runId, fence: 1, sequence: 1, kind: "accepted", payload: eventPayload, payloadHash: localPayloadHash(eventPayload) };
    await journal.recordEvent(event);
    const status = await runPublicCli(fixture.preloadPath, fixture.env, ["status", "--run", runId, "--details", "true"]);
    expect(status.code).toBe(0);
    expect(JSON.parse(status.stdout.trim())).toMatchObject({ paired: true, machineId: "11111111-1111-4111-8111-111111111111", run: { id: runId, state: "accepted", events: [event] } });
    expect(status.stdout).not.toContain("private-checkout-handle");
    expect(status.stdout).not.toContain("rotated-private-token");
    expect(status.stdout).not.toContain("private-token");
  });

  it("IT-219 invalidates the local credential through the public unpair command", async () => {
    const fixture = await publicCliFixture(true);
    const unpair = await runPublicCli(fixture.preloadPath, fixture.env, ["unpair"]);
    expect(unpair.code).toBe(0);
    expect(JSON.parse(unpair.stdout.trim())).toMatchObject({ paired: false, remoteRevocation: "complete" });
    expect((await fixture.store.read()).machine).toBeUndefined();
  });

  it("rejects non-HTTPS pairing servers before making a request", async () => {
    const fixture = await publicCliFixture();
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["pair", "--server", "http://public.invalid"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("invalid_server");
    expect(result.stdout).not.toContain(fixture.directory);
  });

  it("reports an expired pairing with a safe public reason", async () => {
    const fixture = await publicCliFixture();
    await writeFile(fixture.preloadPath, `globalThis.fetch = async (input) => new URL(input).pathname.endsWith("/pairings") ? new Response(JSON.stringify({ pairingId: "pair-1", code: "123456", expiresAt: "2000-01-01T00:00:00.000Z", confirmationUrl: "https://flow.test/pair/123456" }), { status: 201 }) : new Response("{}", { status: 503 });`);
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["pair", "--server", "https://flow.test"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("pairing_expired");
    expect(result.stdout).not.toContain(fixture.directory);
  });

  it("maps consumed pairing and unavailable servers to bounded public errors", async () => {
    const consumed = await publicCliFixture();
    await writeFile(consumed.preloadPath, `globalThis.fetch = async (input) => new URL(input).pathname.endsWith("/pairings") ? new Response(JSON.stringify({ pairingId: "pair-1", code: "123456", expiresAt: new Date(Date.now() + 60000).toISOString(), confirmationUrl: "https://flow.test/pair/123456" }), { status: 201 }) : new Response(JSON.stringify({ error: { reason: "pairing_consumed" } }), { status: 409 });`);
    const consumedResult = await runPublicCli(consumed.preloadPath, consumed.env, ["pair", "--server", "https://flow.test"]);
    expect(consumedResult.code).toBe(1);
    expect(consumedResult.stdout).toContain("pairing_consumed");
    expect(consumedResult.stdout).not.toContain(consumed.directory);

    const offline = await publicCliFixture();
    await writeFile(offline.preloadPath, "globalThis.fetch = async () => { throw new Error('offline'); };");
    const offlineResult = await runPublicCli(offline.preloadPath, offline.env, ["pair", "--server", "https://flow.test"]);
    expect(offlineResult.code).toBe(1);
    expect(offlineResult.stdout).toContain("connector_unavailable");
    expect(offlineResult.stdout).not.toContain(offline.directory);
  });

  it("reports invalid local Git roots without exposing their path", async () => {
    const fixture = await publicCliFixture(true);
    const missing = await runPublicCli(fixture.preloadPath, fixture.env, ["link", "--project", "33333333-3333-4333-8333-333333333333", "--path", join(fixture.directory, "missing"), "--expected-revision", "0"]);
    expect(missing.code).toBe(1);
    expect(missing.stdout).toContain("path_invalid");
    expect(missing.stdout).not.toContain(fixture.directory);
    const nonGit = join(fixture.directory, "non-git");
    await mkdir(nonGit);
    const invalid = await runPublicCli(fixture.preloadPath, fixture.env, ["link", "--project", "33333333-3333-4333-8333-333333333333", "--path", nonGit, "--expected-revision", "0"]);
    expect(invalid.code).toBe(1);
    expect(invalid.stdout).toContain("not_git_root");
    expect(invalid.stdout).not.toContain(fixture.directory);
  });

  it.each([
    ["IT-205", "repository_mismatch", "repository_mismatch", 412],
    ["IT-206", "link_changed", "link_changed", 409],
    ["IT-207", "machine_revoked", "machine_unauthorized", 401],
  ] as const)("%s maps a hosted link failure to %s without disclosing local paths", async (_id, expected, serverReason, status) => {
    const fixture = await publicCliFixture(true);
    await writeFile(fixture.preloadPath, `globalThis.fetch = async () => new Response(JSON.stringify({ error: { reason: "${serverReason}" } }), { status: ${status} });`);
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["link", "--project", "33333333-3333-4333-8333-333333333333", "--path", fixture.projectRoot, "--expected-revision", "1"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain(expected);
    expect(result.stdout).not.toContain(fixture.directory);
    expect(result.stdout).not.toContain("private-token");
  });

  it.each([
    ["IT-216", "See [the required rule](.agents/rules/mandatory.md).\n", "instructions_invalid"],
    ["IT-217", "No mandatory gates.\n", "runtime_incompatible"],
  ] as const)("%s reports %s from detailed local readiness", async (_id, instructions, expected) => {
    const fixture = await publicCliFixture(true);
    const link = await new LocalCheckoutRegistry(fixture.store, [fixture.directory]).link({ path: fixture.projectRoot, expectedRepository: "flow/web", label: "Checkout" });
    await writeFile(join(fixture.projectRoot, "AGENTS.md"), instructions);
    const runId = "66666666-6666-4666-8666-666666666666";
    const commandId = "77777777-7777-4777-8777-777777777777";
    const target = { machineId: "11111111-1111-4111-8111-111111111111", linkId: "55555555-5555-4555-8555-555555555555", linkRevision: 1, checkoutHandle: link.handle };
    const payload = { preparationId: "44444444-4444-4444-8444-444444444444", actionId: "action-1", taskId: "33333333-3333-4333-8333-333333333333", snapshot: { kind: "create_spec" }, task: { issueNumber: 41, title: "Task", bodyMarkdown: "Details" } };
    const journal = new LocalCommandJournal(fixture.env.FLOW_LOCAL_JOURNAL!);
    const command: LocalCommand = { protocolVersion: 1, commandId, machineId: target.machineId, projectId: payload.taskId, runId, actorId: "88888888-8888-4888-8888-888888888888", fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target, kind: "start", payload, payloadHash: localPayloadHash(payload) };
    await journal.dispatch(command, async () => "runtime-session");
    if (expected === "runtime_incompatible") {
      const binary = join(fixture.directory, "incompatible-compozy");
      await writeFile(binary, "#!/bin/sh\necho v99.0\n");
      await chmod(binary, 0o700);
      fixture.env.FLOW_COMPOZY_BIN = binary;
    }
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["status", "--run", runId]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain(expected);
    expect(result.stdout).not.toContain(fixture.directory);
    expect(result.stdout).not.toContain("private-token");
  });

  it("rejects local link paths over the byte limit before host egress", async () => {
    const fixture = await publicCliFixture(true);
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["link", "--project", "33333333-3333-4333-8333-333333333333", "--path", `/${"a".repeat(4096)}`, "--expected-revision", "1"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("path_limit");
    expect(result.stdout).not.toContain("a".repeat(100));
  });

  it("IT-203 refuses a canonical Git root outside the configured allowlist", async () => {
    const fixture = await publicCliFixture(true);
    const outside = await mkdtemp(join(tmpdir(), "flow-cli-outside-"));
    roots.push(outside);
    execFileSync("git", ["init", outside], { stdio: "ignore" });
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["link", "--project", "33333333-3333-4333-8333-333333333333", "--path", outside, "--expected-revision", "1"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("path_not_allowed");
    expect(result.stdout).not.toContain(outside);
  });

  it("returns safe not_paired from public status and run commands", async () => {
    const fixture = await publicCliFixture();
    for (const command of ["status", "run"]) {
      const result = await runPublicCli(fixture.preloadPath, fixture.env, [command]);
      expect(result.code).toBe(1);
      expect(result.stdout).toContain("not_paired");
      expect(result.stdout).not.toContain(fixture.directory);
    }
  });

  it("IT-218 reports an unknown run with the public run_unavailable reason", async () => {
    const fixture = await publicCliFixture(true);
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["status", "--run", "66666666-6666-4666-8666-666666666666"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("run_unavailable");
    expect(result.stdout).not.toContain("private-token");
    expect(result.stdout).not.toContain(fixture.directory);
  });

  it("IT-208 polls and journals an owned command through the public run process", async () => {
    const fixture = await publicCliFixture(true);
    const machineId = "11111111-1111-4111-8111-111111111111";
    const projectId = "33333333-3333-4333-8333-333333333333";
    const runId = "66666666-6666-4666-8666-666666666666";
    const target = { machineId, linkId: "55555555-5555-4555-8555-555555555555", linkRevision: 1, checkoutHandle: "checkout-handle" };
    const startPayload = { preparationId: "44444444-4444-4444-8444-444444444444", actionId: "action-1", taskId: projectId, snapshot: { kind: "create_spec" }, task: { issueNumber: 41, title: "Task", bodyMarkdown: "Details" } };
    const journal = new LocalCommandJournal(fixture.env.FLOW_LOCAL_JOURNAL!);
    const start: LocalCommand = { protocolVersion: 1, commandId: "77777777-7777-4777-8777-777777777777", machineId, projectId, runId, actorId: "88888888-8888-4888-8888-888888888888", fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target, kind: "start", payload: startPayload, payloadHash: localPayloadHash(startPayload) };
    await journal.dispatch(start, async () => "runtime-session");
    const inspectPayload = {};
    const inspect: LocalCommand = { protocolVersion: 1, commandId: "99999999-9999-4999-8999-999999999999", machineId, projectId, runId, actorId: start.actorId, fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target, kind: "inspect", payload: inspectPayload, payloadHash: localPayloadHash(inspectPayload) };
    await writeFile(fixture.preloadPath, `
      const originalSetTimeout = globalThis.setTimeout;
      globalThis.setTimeout = (callback, milliseconds, ...args) => originalSetTimeout(callback, milliseconds === 10000 ? 5 : milliseconds, ...args);
      let polled = false;
      globalThis.fetch = async (input) => {
        const path = new URL(input).pathname;
        if (path.endsWith("/heartbeat")) return new Response(JSON.stringify({ credentialGeneration: 1, credentialExpiresAt: new Date(Date.now() + 60000).toISOString() }), { status: 200 });
        if (path.endsWith("/poll")) { if (polled) return new Response(JSON.stringify({ protocolVersion: 1, commands: [] }), { status: 200 }); polled = true; return new Response(JSON.stringify({ protocolVersion: 1, commands: [${JSON.stringify(inspect)}] }), { status: 200 }); }
        if (path.endsWith("/events")) { originalSetTimeout(() => process.kill(process.pid, "SIGINT"), 5); return new Response(JSON.stringify({ protocolVersion: 1, acknowledgements: [{ acknowledgedSequence: 1 }] }), { status: 200 }); }
        return new Response("{}", { status: 404 });
      };
    `);
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["run"]);
    expect(result.code).toBe(0);
    const journalValue = JSON.parse(await readFile(fixture.env.FLOW_LOCAL_JOURNAL!, "utf8")) as { entries: Array<{ command: { commandId: string }; events: Array<{ kind: string; payload: { summary?: string } }> }> };
    const processed = journalValue.entries.find((entry) => entry.command.commandId === inspect.commandId);
    expect(processed?.events).toMatchObject([{ kind: "activity", payload: { summary: "Local run accepted" } }]);
    expect(JSON.stringify(processed)).not.toContain(fixture.directory);
  });

  it("IT-212 journals an incompatible native runtime from the public run process", async () => {
    const fixture = await publicCliFixture(true);
    const link = await new LocalCheckoutRegistry(fixture.store, [fixture.directory]).link({ path: fixture.projectRoot, expectedRepository: "flow/web", label: "Checkout" });
    const binary = join(fixture.directory, "incompatible-compozy");
    await writeFile(binary, "#!/bin/sh\necho v99.0\n");
    await chmod(binary, 0o700);
    fixture.env.FLOW_COMPOZY_BIN = binary;
    const machineId = "11111111-1111-4111-8111-111111111111";
    const preparationId = "44444444-4444-4444-8444-444444444444";
    const target = { machineId, linkId: "55555555-5555-4555-8555-555555555555", linkRevision: 1, checkoutHandle: link.handle };
    const payload = { preparationId, actionId: "action-1", sourceSnapshotId: "33333333-3333-4333-8333-333333333333", checkoutLabel: "Checkout", action: { kind: "create_spec", runtime: { providerId: "codex" } } };
    const command: LocalCommand = { protocolVersion: 1, commandId: preparationId, machineId, projectId: payload.sourceSnapshotId, runId: preparationId, actorId: "88888888-8888-4888-8888-888888888888", fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(), target, kind: "prepare", payload, payloadHash: localPayloadHash(payload) };
    await writeFile(fixture.preloadPath, `
      const originalSetTimeout = globalThis.setTimeout;
      globalThis.setTimeout = (callback, milliseconds, ...args) => originalSetTimeout(callback, milliseconds === 10000 ? 5 : milliseconds, ...args);
      let polled = false;
      globalThis.fetch = async (input) => {
        const path = new URL(input).pathname;
        if (path.endsWith("/heartbeat")) return new Response(JSON.stringify({ credentialGeneration: 1, credentialExpiresAt: new Date(Date.now() + 60000).toISOString() }), { status: 200 });
        if (path.endsWith("/poll")) { if (polled) return new Response(JSON.stringify({ protocolVersion: 1, commands: [] }), { status: 200 }); polled = true; return new Response(JSON.stringify({ protocolVersion: 1, commands: [${JSON.stringify(command)}] }), { status: 200 }); }
        if (path.endsWith("/events")) { originalSetTimeout(() => process.kill(process.pid, "SIGINT"), 5); return new Response(JSON.stringify({ protocolVersion: 1, acknowledgements: [{ acknowledgedSequence: 1 }] }), { status: 200 }); }
        return new Response("{}", { status: 404 });
      };
    `);
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["run"]);
    expect(result.code).toBe(0);
    const journalValue = JSON.parse(await readFile(fixture.env.FLOW_LOCAL_JOURNAL!, "utf8")) as { entries: Array<{ command: { commandId: string }; events: Array<{ kind: string; payload: { reason?: string } }> }> };
    const prepared = journalValue.entries.find((entry) => entry.command.commandId === command.commandId);
    expect(prepared?.events).toMatchObject([{ kind: "terminal", payload: { outcome: "blocked", reason: "runtime_incompatible" } }]);
    expect(JSON.stringify(prepared)).not.toContain(fixture.directory);
  });

  it.each([
    ["IT-210", "machine_revoked", "/api/local-connector/heartbeat", 401],
    ["IT-211", "protocol_incompatible", "/api/local-connector/poll", 409],
  ] as const)("%s reports %s from the public run command without leaking private state", async (_id, expected, endpoint, status) => {
    const fixture = await publicCliFixture(true);
    await writeFile(fixture.preloadPath, `globalThis.fetch = async (input) => { const path = new URL(input).pathname; if (path.endsWith("${endpoint}") && "${expected}" === "machine_revoked") return new Response(JSON.stringify({ error: { reason: "machine_unauthorized" } }), { status: 401 }); if (path.endsWith("${endpoint}")) return new Response(JSON.stringify({ protocolVersion: 99, commands: [] }), { status: ${status === 409 ? 200 : status} }); if (path.endsWith("/heartbeat")) return new Response(JSON.stringify({ credentialGeneration: 1, credentialExpiresAt: new Date(Date.now() + 60000).toISOString() }), { status: 200 }); return new Response(JSON.stringify({ error: { reason: "${expected}" } }), { status: ${status} }); };
    `);
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["run"]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain(expected);
    expect(result.stdout).not.toContain(fixture.directory);
    expect(result.stdout).not.toContain("private-token");
  });

  it("retains remote revocation explicitly when public unpair runs offline", async () => {
    const fixture = await publicCliFixture(true);
    await writeFile(fixture.preloadPath, "globalThis.fetch = async () => { throw new Error('offline'); };");
    const result = await runPublicCli(fixture.preloadPath, fixture.env, ["unpair"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toMatchObject({ paired: false, remoteRevocation: "pending", reason: "connector_unavailable" });
    expect(result.stdout).not.toContain("private-token");
    expect((await fixture.store.read()).machine).toBeUndefined();
    expect((await fixture.store.read()).pendingRevocation).toMatchObject({ machineId: "11111111-1111-4111-8111-111111111111" });
  });

  it("keeps heartbeat recovery behavior in the typed client", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-cli-public-heartbeat-"));
    roots.push(directory);
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    await store.write({ version: 1, entries: [], machine: { server: "https://flow.test", machineId: "machine-1", label: "Laptop", token: "old-token", expiresAt: new Date(Date.now() + 1000).toISOString(), credentialGeneration: 1 } });
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(json({ credentialGeneration: 1, credentialExpiresAt: new Date(Date.now() + 1000).toISOString(), credentialRotation: { token: "new-token", generation: 2, expiresAt: new Date(Date.now() + 86_400_000).toISOString() } })).mockResolvedValueOnce(json({ credentialGeneration: 2, credentialExpiresAt: new Date(Date.now() + 86_400_000).toISOString() }));
    const client = new LocalConnectorClient(fetcher, async () => ({ providers: [], loops: [] }));
    await expect(client.heartbeat(store)).rejects.toThrow("connector_unavailable");
    expect((await store.read()).pendingHeartbeat?.requestKey).toBeTruthy();
    await client.heartbeat(store);
    await client.heartbeat(store);
    expect((await store.read()).machine).toMatchObject({ token: "new-token", credentialGeneration: 2 });
  });



  it("persists a private pending pairing, reuses its exchange key, and stores the machine token after confirmation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-cli-"));
    roots.push(directory);
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ pairingId: "pair-1", code: "short-code", expiresAt: new Date(Date.now() + 60_000).toISOString(), confirmationUrl: "https://flow.test/settings/local-machine/pairing/short-code" }))
      .mockResolvedValueOnce(json({ state: "pending" }))
      .mockResolvedValueOnce(json({ state: "complete", machineId: "machine-1", token: "opaque-token", expiresAt: new Date(Date.now() + 86_400_000).toISOString() }));
    const client = new LocalConnectorClient(fetcher, async () => ({ providers: [], loops: [] }));
    const confirmed: string[] = [];
    await expect(client.pair("https://flow.test", "Developer laptop", (url) => confirmed.push(url), store, async () => {})).resolves.toMatchObject({ machineId: "machine-1" });
    const registry = await store.read();
    expect(registry.machine?.token).toBe("opaque-token");
    expect(registry.pendingPairing).toBeUndefined();
    expect(confirmed).toEqual(["https://flow.test/settings/local-machine/pairing/short-code"]);
    const exchangeBodies = fetcher.mock.calls.slice(1).map((call) => JSON.parse(String(call[1]?.body)) as { requestKey: string });
    expect(exchangeBodies[0]?.requestKey).toBe(exchangeBodies[1]?.requestKey);
    expect(fetcher.mock.calls[0]?.[1]?.headers).toEqual({ "content-type": "application/json" });
    expect((await stat(join(directory, "registry.json"))).mode & 0o777).toBe(0o600);
    expect(await readFile(join(directory, "registry.json"), "utf8")).toContain("opaque-token");
  });

  it("rejects non-HTTPS pairing servers before making a request", async () => {
    const fetcher = vi.fn();
    await expect(new LocalConnectorClient(fetcher).pair("http://flow.test", "Laptop", () => {})).rejects.toThrow("invalid_server");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("stays online without local models when the installed runtime is not the required version", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-cli-runtime-"));
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    await store.write({ version: 1, entries: [], machine: { server: "https://flow.test", machineId: "machine-1", label: "Laptop", token: "opaque-token", expiresAt: "2026-11-01T00:00:00.000Z", credentialGeneration: 1 } });
    const fetcher = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ credentialGeneration: 1, credentialExpiresAt: "2026-11-01T00:00:00.000Z" }), { status: 200 }));
    const incompatible = async () => { throw new Error("runtime_incompatible"); };
    await expect(new LocalConnectorClient(fetcher, incompatible).heartbeat(store)).resolves.toMatchObject({ credentialGeneration: 1 });
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({ providerCatalog: [], capabilities: ["commands", "events"] });
    const unreadable = async () => { throw new Error("catalog_changed"); };
    await store.write({ ...(await store.read()), providerCatalogCheckedAt: undefined, providerCatalog: undefined });
    await expect(new LocalConnectorClient(fetcher, unreadable).heartbeat(store)).rejects.toThrow("catalog_changed");
  });

  it("accepts plain HTTP only for a loopback pairing server", async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request) => new Response(JSON.stringify({ error: { reason: "rate_limited" } }), { status: 429 }));
    await expect(new LocalConnectorClient(fetcher).pair("http://localhost:3000", "Laptop", () => {}, new PrivateRegistryStore(join(await mkdtemp(join(tmpdir(), "flow-loopback-")), "registry.json")))).rejects.toThrow("rate_limited");
    expect(String(fetcher.mock.calls[0]?.[0])).toBe("http://localhost:3000/api/local-connector/pairings");
    await expect(new LocalConnectorClient(fetcher).pair("http://localhost.evil.test", "Laptop", () => {})).rejects.toThrow("invalid_server");
  });

  it("reuses a lost heartbeat key, persists the rotated token, then acknowledges its generation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-cli-rotation-"));
    roots.push(directory);
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    await store.write({ version: 1, entries: [], machine: { server: "https://flow.test", machineId: "machine-1", label: "Laptop", token: "old-token", expiresAt: new Date(Date.now() + 1000).toISOString(), credentialGeneration: 1 } });
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("network dropped"))
      .mockResolvedValueOnce(json({ credentialGeneration: 1, credentialExpiresAt: new Date(Date.now() + 1000).toISOString(), credentialRotation: { token: "new-token", generation: 2, expiresAt: new Date(Date.now() + 86_400_000).toISOString() } }))
      .mockResolvedValueOnce(json({ credentialGeneration: 2, credentialExpiresAt: new Date(Date.now() + 86_400_000).toISOString() }));
    const client = new LocalConnectorClient(fetcher, async () => ({ providers: [], loops: [] }));
    await expect(client.heartbeat(store)).rejects.toThrow("connector_unavailable");
    const pending = await store.read();
    expect(pending.pendingHeartbeat?.requestKey).toBeTruthy();
    await client.heartbeat(store);
    const rotated = await store.read();
    expect(rotated.machine).toMatchObject({ token: "new-token", credentialGeneration: 2 });
    await client.heartbeat(store);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).requestKey).toBe(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body)).requestKey);
    expect(JSON.parse(String(fetcher.mock.calls[2]?.[1]?.body)).acknowledgedCredentialGeneration).toBe(2);
    expect(fetcher.mock.calls[2]?.[1]?.headers).toMatchObject({ authorization: "Bearer new-token" });
  });

  it("discovers and caches the bounded local provider and Loop catalogs before heartbeat egress", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-cli-catalog-"));
    roots.push(directory);
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    await store.write({ version: 1, entries: [], machine: { server: "https://flow.test", machineId: "machine-1", label: "Laptop", token: "token", expiresAt: new Date(Date.now() + 60_000).toISOString() } });
    const catalog = [{ providerId: "codex" as const, providerKind: "codex" as const, label: "Codex local", models: [{ modelId: "gpt-local", displayName: "GPT local", selectable: true, unselectableReason: null, reasoningChoices: ["medium"] }] }];
    const loops = [{ name: "implement-tasks", version: "0", source: "marketplace", enabled: true, description: "Implement task files.", inputs: [{ name: "slug", kind: "string", required: true, hasDefault: false, enumValues: null }], runtimeRoles: ["default_runtime"], runtimeLocked: false, requires: [] }];
    const discover = vi.fn(async () => ({ providers: catalog, loops }));
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(json({ credentialGeneration: 1, credentialExpiresAt: new Date(Date.now() + 60_000).toISOString() })));
    const client = new LocalConnectorClient(fetcher, discover);
    await client.heartbeat(store);
    await client.heartbeat(store);
    expect(discover).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toMatchObject({ providerCatalog: catalog, loopCatalog: loops, capabilities: ["commands", "events", "provider-codex"] });
    expect(await store.read()).toMatchObject({ providerCatalog: catalog, loopCatalog: loops });
  });

  it("invalidates the local token immediately and retains only a pending remote revocation until acknowledged", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-cli-unpair-"));
    roots.push(directory);
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    await store.write({ version: 1, entries: [], machine: { server: "https://flow.test", machineId: "machine-1", label: "Laptop", token: "secret-token", expiresAt: new Date(Date.now() + 60_000).toISOString() } });
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(json({ machineId: "machine-1", revokedAt: new Date().toISOString() }));
    const client = new LocalConnectorClient(fetcher, async () => ({ providers: [], loops: [] }));
    await expect(client.unpair(store)).resolves.toEqual({ paired: false, remoteRevocation: "pending", reason: "connector_unavailable" });
    const pendingRegistry = await store.read();
    expect(pendingRegistry).not.toHaveProperty("machine");
    expect(pendingRegistry.pendingRevocation).toMatchObject({ machineId: "machine-1", token: "secret-token" });
    await expect(client.unpair(store)).resolves.toEqual({ paired: false, remoteRevocation: "complete" });
    const unpairedRegistry = await store.read();
    expect(unpairedRegistry).not.toHaveProperty("machine");
    expect(unpairedRegistry).not.toHaveProperty("pendingRevocation");
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)));
  });

  it("journals a polled command before execution and uploads its safe event", async () => {
    const directory = await mkdtemp(join(tmpdir(), "flow-cli-run-"));
    roots.push(directory);
    const store = new PrivateRegistryStore(join(directory, "registry.json"));
    await store.write({ version: 1, entries: [], machine: { server: "https://flow.test", machineId: "11111111-1111-4111-8111-111111111111", label: "Laptop", token: "secret-token", expiresAt: new Date(Date.now() + 60_000).toISOString() } });
    const payload = { preparationId: "33333333-3333-4333-8333-333333333333", actionId: "action-1", taskId: "22222222-2222-4222-8222-222222222222", snapshot: {}, task: { issueNumber: 42, title: "Task", bodyMarkdown: "Details" } };
    const command: LocalCommand = {
      protocolVersion: 1, commandId: "44444444-4444-4444-8444-444444444444", machineId: "11111111-1111-4111-8111-111111111111",
      projectId: "22222222-2222-4222-8222-222222222222", runId: "55555555-5555-4555-8555-555555555555",
      actorId: "66666666-6666-4666-8666-666666666666", fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      target: { machineId: "11111111-1111-4111-8111-111111111111", linkId: "77777777-7777-4777-8777-777777777777", linkRevision: 1, checkoutHandle: "handle-1" },
      payloadHash: localPayloadHash(payload), kind: "start", payload,
    };
    const eventPayload = { runtimeExecutionId: "runtime-1", runtimeWorkspaceId: "workspace-1", runtimeSessionId: "session-1", runtimeTurnId: null };
    const event: LocalEvent = {
      protocolVersion: 1, commandId: command.commandId, runId: command.runId, fence: command.fence, sequence: 1,
      payloadHash: localPayloadHash(eventPayload), kind: "accepted", payload: eventPayload,
    };
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ machineId: command.machineId, readiness: "ready" }))
      .mockResolvedValueOnce(json({ protocolVersion: 1, commands: [command] }))
      .mockResolvedValueOnce(json({ protocolVersion: 1, acknowledgements: [{ acknowledgedSequence: 1 }] }));
    const abort = new AbortController();
    const journal = new LocalCommandJournal(join(directory, "journal.json"));
    await new LocalConnectorClient(fetcher, async () => ({ providers: [], loops: [] })).run({ store, journal, signal: abort.signal, sleep: async () => {}, handle: async () => { abort.abort(); return [event]; } });
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      "https://flow.test/api/local-connector/heartbeat",
      "https://flow.test/api/local-connector/poll",
      "https://flow.test/api/local-connector/events",
    ]);
    await expect(journal.forRun(command.runId)).resolves.toMatchObject({ state: "accepted", runtimeId: "runtime-1", events: [event] });
  });
});


async function publicCliFixture(paired = false) {
  const directory = await mkdtemp(join(tmpdir(), "flow-cli-public-"));
  roots.push(directory);
  const registryPath = join(directory, "registry.json");
  const projectRoot = join(directory, "checkout");
  await mkdir(projectRoot);
  execFileSync("git", ["init", projectRoot], { stdio: "ignore" });
  execFileSync("git", ["-C", projectRoot, "remote", "add", "origin", "https://github.com/flow/web.git"], { stdio: "ignore" });
  const store = new PrivateRegistryStore(registryPath);
  await store.write({ version: 1, entries: [], providerCatalog: [], providerCatalogCheckedAt: new Date().toISOString(), ...(paired ? { machine: { server: "https://flow.test", machineId: "11111111-1111-4111-8111-111111111111", label: "Laptop", token: "private-token", expiresAt: new Date(Date.now() + 86_400_000).toISOString(), credentialGeneration: 1 } } : {}) });
  const preloadPath = join(directory, "fake-fetch.mjs");
  await writeFile(preloadPath, `
    globalThis.fetch = async (input, init = {}) => {
      const path = new URL(input).pathname;
      const values = {
        "/api/local-connector/pairings": { pairingId: "pair-1", code: "123456", expiresAt: new Date(Date.now() + 60000).toISOString(), confirmationUrl: "https://flow.test/pair/123456" },
        "/api/local-connector/pairings/exchange": { state: "complete", machineId: "11111111-1111-4111-8111-111111111111", token: "private-token", expiresAt: new Date(Date.now() + 86400000).toISOString() },
        "/api/local-connector/heartbeat": { credentialGeneration: 1, credentialExpiresAt: new Date(Date.now() + 86400000).toISOString(), credentialRotation: { token: "rotated-private-token", generation: 2, expiresAt: new Date(Date.now() + 86400000).toISOString() } },
        "/api/local-connector/links": { linkId: "22222222-2222-4222-8222-222222222222", revision: 1 },
        "/api/local-connector/unpair": { machineId: "11111111-1111-4111-8111-111111111111", revokedAt: new Date().toISOString() }
      };
      if (!values[path]) return new Response(JSON.stringify({ error: { reason: "connector_unavailable" } }), { status: 503 });
      return new Response(JSON.stringify(values[path]), { status: 200, headers: { "content-type": "application/json" } });
    };
  `);
  const env: NodeJS.ProcessEnv = { ...process.env, FLOW_LOCAL_REGISTRY: registryPath, FLOW_LOCAL_JOURNAL: join(directory, "journal.json"), FLOW_LOCAL_ALLOWED_ROOTS: directory };
  return { directory, projectRoot, preloadPath, env, store };
}

function json(value: unknown) { return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } }); }

function runPublicCli(preloadPath: string, env: NodeJS.ProcessEnv, args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "--import", preloadPath, "src/cli/localConnector.ts", ...args], { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("public_cli_timeout")); }, 15_000);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", (error) => { clearTimeout(timeout); reject(error); });
    child.once("close", (code) => { clearTimeout(timeout); resolveResult({ code, stdout, stderr }); });
  });
}
