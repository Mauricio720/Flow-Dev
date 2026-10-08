import { afterEach, describe, expect, it } from "vitest";
import { failureOf, key, softwareFixture, type SoftwareFixture } from "./software-support";
import { localMachines, softwareConnections } from "../src/infra/database/schema";

let current: SoftwareFixture | undefined;
afterEach(async () => { await current?.close(); current = undefined; });

async function connectCodex(fixture: SoftwareFixture, label = "Codex principal") {
  const start = await fixture.adminCaller.beginCodexLogin({ label, idempotencyKey: key() });
  fixture.broker.authenticate(start.operationId);
  const polled = await fixture.adminCaller.pollLogin({ operationId: start.operationId });
  const confirmed = await fixture.adminCaller.confirmAccount({ operationId: start.operationId, expectedConnectionRevision: start.connectionRevision });
  return { start, polled, confirmed };
}

describe("codex connection lifecycle", () => {
  it("keeps machine provider metadata scoped to its owner and out of hosted connection administration", async () => {
    current = await softwareFixture();
    const machineId = crypto.randomUUID();
    await current.database.insert(localMachines).values({ id: machineId, ownerUserId: current.admin.id, label: "Developer laptop", credentialHash: "opaque-hash", credentialExpiresAt: new Date(Date.now() + 60_000) });
    await current.database.insert(softwareConnections).values({ label: "Local Codex", providerKind: "codex", runtimeProviderId: `${machineId}:codex`, executionTarget: "machine", machineId, ownerUserId: current.admin.id, authState: "connected", createdBy: current.admin.id });
    const adminVisible = await current.dao.connections.list({ limit: 50, visibleToOwnerId: current.admin.id });
    const memberVisible = await current.dao.connections.list({ limit: 50, visibleToOwnerId: current.member.id });
    expect(adminVisible.items).toHaveLength(1);
    expect(adminVisible.items[0]).toMatchObject({ executionTarget: "machine", ownerUserId: current.admin.id, machineId });
    expect(memberVisible.items).toEqual([]);
    expect((await current.adminCaller.connections({})).items).toEqual([]);
  });

  it("IT-022, IT-027 and IT-025 connect once, idempotently, and only for administrators", async () => {
    current = await softwareFixture();
    const { start, polled, confirmed } = await connectCodex(current);
    expect(start).toMatchObject({ verificationUrl: "https://auth.example/device", userCode: "ABCD-1234" });
    expect(polled).toMatchObject({ state: "awaiting_confirmation", differsFromCurrent: false });
    expect(confirmed).toMatchObject({ authState: "connected", identityLabel: "m***@example.com" });
    const row = (await current.adminCaller.connections({})).items[0]!;
    expect(current.gateway.overlays.size).toBe(1);
    expect([...current.gateway.overlays.values()][0]).toMatchObject({ providerKind: "codex", homePath: `/tmp/private/${row.id}` });
    const again = await current.adminCaller.confirmAccount({ operationId: start.operationId, expectedConnectionRevision: start.connectionRevision });
    expect(again).toEqual(confirmed);
    expect(current.broker.revision).toBe(1);
    const [{ count }] = await current.client`SELECT count(*)::int AS count FROM software_connections`;
    expect(count).toBe(1);
    expect(await failureOf(current.memberCaller.beginCodexLogin({ label: "Outro", idempotencyKey: key() }))).toMatchObject({ code: "FORBIDDEN" });
    expect(await failureOf(current.memberCaller.pollLogin({ operationId: start.operationId }))).toMatchObject({ code: "FORBIDDEN" });
    expect(JSON.stringify([start, polled, confirmed])).not.toMatch(/token|auth\.json|maria@/i);
  });

  it("IT-026 rejects an overlapping login and a different administrator following the operation", async () => {
    current = await softwareFixture();
    const first = await current.adminCaller.beginCodexLogin({ label: "Codex", idempotencyKey: key() });
    const connections = await current.adminCaller.connections({});
    const connectionId = connections.items[0]!.id;
    expect(await failureOf(current.adminCaller.beginCodexLogin({ connectionId, idempotencyKey: key() }))).toEqual({ code: "CONFLICT", reason: "login_in_progress" });
    const replay = await current.adminCaller.beginCodexLogin({ label: "Codex", idempotencyKey: first.operationId === "" ? key() : (await current.client`SELECT idempotency_key FROM software_auth_operations`)[0]!.idempotency_key });
    expect(replay.operationId).toBe(first.operationId);
    await current.client`INSERT INTO admin_designations(github_user_id, resolved_login) VALUES ('88','member')`;
    expect(await failureOf(current.memberCaller.pollLogin({ operationId: first.operationId }))).toEqual({ code: "FORBIDDEN", reason: "operation_forbidden" });
  });

  it("IT-026 recovers a login the server forgot after a restart instead of blocking the connection", async () => {
    current = await softwareFixture();
    const first = await current.adminCaller.beginCodexLogin({ label: "Codex", idempotencyKey: key() });
    current.broker.authenticate(first.operationId);
    await current.adminCaller.pollLogin({ operationId: first.operationId });
    current.broker.lostOperations.add(first.operationId);
    const retry = await current.adminCaller.beginCodexLogin({ connectionId: first.connectionId, idempotencyKey: key() });
    expect(retry.operationId).not.toBe(first.operationId);
    const [stale] = await current.client`SELECT state, failure_code FROM software_auth_operations WHERE id=${first.operationId}`;
    expect(stale).toMatchObject({ state: "expired", failure_code: "login_lost" });
  });

  it("IT-023 and IT-024 keep the working account when a reconnect expires or is declined", async () => {
    current = await softwareFixture();
    const { start } = await connectCodex(current);
    const reconnect = await current.adminCaller.beginCodexLogin({ connectionId: start.connectionId, idempotencyKey: key() });
    current.broker.statuses.set(reconnect.operationId, { state: "failed", operationId: reconnect.operationId, code: "auth_declined", credentialRevision: 1 });
    expect(await current.adminCaller.pollLogin({ operationId: reconnect.operationId })).toEqual({ state: "failed", code: "auth_declined" });
    const [row] = (await current.adminCaller.connections({})).items;
    expect(row).toMatchObject({ authState: "connected", accountLabel: "m***@example.com" });
    expect(await failureOf(current.adminCaller.confirmAccount({ operationId: reconnect.operationId, expectedConnectionRevision: row!.revision }))).toMatchObject({ code: "PRECONDITION_FAILED" });
    const retry = await current.adminCaller.beginCodexLogin({ connectionId: start.connectionId, idempotencyKey: key() });
    expect(retry.operationId).not.toBe(reconnect.operationId);
  });

  it("IT-030 shows a different account and requires the matching revision to swap", async () => {
    current = await softwareFixture();
    const { start } = await connectCodex(current);
    const reconnect = await current.adminCaller.beginCodexLogin({ connectionId: start.connectionId, idempotencyKey: key() });
    current.broker.authenticate(reconnect.operationId, "a".repeat(64));
    expect(await current.adminCaller.pollLogin({ operationId: reconnect.operationId })).toMatchObject({ state: "awaiting_confirmation", differsFromCurrent: true });
    expect(await failureOf(current.adminCaller.confirmAccount({ operationId: reconnect.operationId, expectedConnectionRevision: 99 }))).toEqual({ code: "CONFLICT", reason: "connection_revision_changed" });
    const confirmed = await current.adminCaller.confirmAccount({ operationId: reconnect.operationId, expectedConnectionRevision: reconnect.connectionRevision });
    expect(confirmed.revision).toBe(reconnect.connectionRevision + 2);
    const events = (await current.adminCaller.history({})).items.map((item) => item.event);
    expect(events).toContain("connection.reconnected");
  });

  it("IT-031, IT-032 and IT-034 handle absent, unauthorized and repeated disconnects", async () => {
    current = await softwareFixture();
    expect((await current.adminCaller.connections({})).items).toEqual([]);
    const { start, confirmed } = await connectCodex(current);
    const input = { connectionId: start.connectionId, expectedRevision: confirmed.revision, idempotencyKey: key() };
    expect(await failureOf(current.memberCaller.disconnect(input))).toMatchObject({ code: "FORBIDDEN" });
    const result = await current.adminCaller.disconnect(input);
    expect(result).toMatchObject({ authState: "disconnected", affectedActiveRuns: 0 });
    expect(await current.adminCaller.disconnect(input)).toEqual(result);
    const next = await current.adminCaller.disconnect({ ...input, expectedRevision: result.revision, idempotencyKey: key() });
    expect(next.revision).toBe(result.revision);
    expect(current.broker.disconnected).toHaveLength(2);
    expect(current.gateway.overlays.size).toBe(0);
  });

  it("IT-035 retries provider cleanup after the database has safely disabled the connection", async () => {
    current = await softwareFixture();
    const { start, confirmed } = await connectCodex(current);
    const input = { connectionId: start.connectionId, expectedRevision: confirmed.revision, idempotencyKey: key() };
    current.gateway.revokeFailure = "service_unavailable";
    await expect(current.adminCaller.disconnect(input)).rejects.toThrow();
    const disabled = (await current.adminCaller.connections({})).items[0]!;
    expect(disabled.authState).toBe("disconnected");
    current.gateway.revokeFailure = null;
    const retried = await current.adminCaller.disconnect(input);
    expect(retried.authState).toBe("disconnected");
    expect(current.broker.disconnected).toEqual([start.connectionId]);
    expect(current.gateway.overlays.size).toBe(0);
  });

  it("UT-006 restores staged credentials when confirmation audit fails", async () => {
    current = await softwareFixture();
    const start = await current.adminCaller.beginCodexLogin({ label: "Codex", idempotencyKey: key() });
    current.broker.authenticate(start.operationId);
    await current.adminCaller.pollLogin({ operationId: start.operationId });
    await current.client`CREATE FUNCTION fail_connection_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event = 'connection.connected' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$`;
    await current.client`CREATE TRIGGER fail_connection_audit BEFORE INSERT ON software_audit FOR EACH ROW EXECUTE FUNCTION fail_connection_audit()`;
    await expect(current.adminCaller.confirmAccount({ operationId: start.operationId, expectedConnectionRevision: start.connectionRevision })).rejects.toThrow();
    expect(current.broker.rolledBackLogins).toEqual([start.operationId]);
    expect((await current.adminCaller.connections({})).items[0]).toMatchObject({ authState: "unconnected", revision: start.connectionRevision + 1 });
  });

  it("UT-007 leaves the credential home untouched when disconnect audit fails", async () => {
    current = await softwareFixture();
    const { start, confirmed } = await connectCodex(current);
    await current.client`CREATE FUNCTION fail_disconnect_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event = 'connection.disconnected' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$`;
    await current.client`CREATE TRIGGER fail_disconnect_audit BEFORE INSERT ON software_audit FOR EACH ROW EXECUTE FUNCTION fail_disconnect_audit()`;
    await expect(current.adminCaller.disconnect({ connectionId: start.connectionId, expectedRevision: confirmed.revision, idempotencyKey: key() })).rejects.toThrow();
    expect(current.broker.disconnected).toEqual([]);
    expect(current.broker.rolledBackDisconnects).toEqual([]);
    expect((await current.adminCaller.connections({})).items[0]).toMatchObject({ authState: "connected", revision: confirmed.revision });
  });
});

describe("connection catalog", () => {
  it("IT-037, IT-040 and IT-041 validate, deduplicate and keep identities after recreation", async () => {
    current = await softwareFixture();
    const { start } = await connectCodex(current, "Codex");
    expect(await failureOf(current.adminCaller.beginCodexLogin({ label: "   ", idempotencyKey: key() }))).toEqual({ code: "BAD_REQUEST", reason: "label_invalid" });
    expect(await failureOf(current.adminCaller.beginCodexLogin({ label: "codex", idempotencyKey: key() }))).toEqual({ code: "CONFLICT", reason: "label_taken" });
    const race = await Promise.allSettled([current.adminCaller.beginCodexLogin({ label: "Nova", idempotencyKey: key() }), current.adminCaller.beginCodexLogin({ label: "NOVA", idempotencyKey: key() })]);
    expect(race.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const row = (await current.adminCaller.connections({})).items.find((item) => item.id === start.connectionId)!;
    const renamed = await current.adminCaller.renameConnection({ connectionId: row.id, label: "Codex antigo", expectedRevision: row.revision });
    const recreated = await current.adminCaller.beginCodexLogin({ label: "Codex", idempotencyKey: key() });
    expect(recreated.connectionId).not.toBe(row.id);
    expect(renamed.label).toBe("Codex antigo");
    expect(await failureOf(current.adminCaller.renameConnection({ connectionId: row.id, label: "x", expectedRevision: row.revision }))).toEqual({ code: "CONFLICT", reason: "connection_revision_changed" });
  });

  it("IT-038 and IT-039 return an empty catalog without defaults and deny non-administrators", async () => {
    current = await softwareFixture();
    expect(await current.adminCaller.connections({})).toMatchObject({ items: [], nextCursor: null });
    expect(await failureOf(current.memberCaller.renameConnection({ connectionId: key(), label: "x", expectedRevision: 1 }))).toMatchObject({ code: "FORBIDDEN" });
    expect(await failureOf(current.memberCaller.connections({}))).toMatchObject({ code: "FORBIDDEN" });
  });

  it("IT-042 pages and searches a large catalog without truncation", async () => {
    current = await softwareFixture();
    for (let index = 0; index < 7; index++) await current.client`INSERT INTO software_connections(label, provider_kind, runtime_provider_id) VALUES (${`Conta ${index}`}, 'codex', ${`codex-${index}`})`;
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await current.adminCaller.connections({ limit: 3, cursor });
      seen.push(...page.items.map((item) => item.label));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen.sort()).toEqual(Array.from({ length: 7 }, (_, index) => `Conta ${index}`));
    expect((await current.adminCaller.connections({ search: "conta 3" })).items.map((item) => item.label)).toEqual(["Conta 3"]);
    expect((await current.adminCaller.connections({ search: "%" })).items).toEqual([]);
  });
});

describe("software readiness", () => {
  it("IT-010 identifies each absence separately for a first run", async () => {
    current = await softwareFixture();
    current.gateway.runtimeFailure = "service_unavailable";
    current.host.checks = { workspaceRootWritable: false, runtimeImagePinned: false, isolationEnforceable: false, credentialRootPrivate: false };
    const readiness = await current.adminCaller.readiness();
    const states = Object.fromEntries(readiness.layers.map((layer) => [layer.layer, [layer.state, layer.reasonCode]]));
    expect(states).toEqual({ application: ["blocked", "software_disabled"], account: ["blocked", "no_connection"], runtime: ["unknown", "runtime_unreachable"], host: ["blocked", "workspace_root_unavailable"] });
  });

  it("IT-011 and IT-021 label stale last-known readiness and revalidate after a dependency changes", async () => {
    current = await softwareFixture();
    await connectCodex(current);
    await current.adminCaller.saveSettings({ values: { enabled: true, docsProxyUrl: "https://docs.example.com", maxActiveActions: 1 }, expectedRevision: 0, idempotencyKey: key() });
    const ready = await current.adminCaller.readiness();
    expect(ready.layers.every((layer) => layer.state === "ready")).toBe(true);
    current.gateway.runtimeFailure = "runtime_incompatible";
    const blocked = await current.adminCaller.readiness();
    expect(blocked.layers.find((layer) => layer.layer === "runtime")).toMatchObject({ state: "blocked", reasonCode: "runtime_incompatible" });
    expect(blocked.layers.find((layer) => layer.layer === "application")?.state).toBe("ready");
  });

  it("IT-012, IT-013 and IT-014 reveal shared blockers once and mark each connection unavailable", async () => {
    current = await softwareFixture();
    await connectCodex(current, "A");
    await connectCodex(current, "B");
    const before = await current.adminCaller.connections({});
    expect(before.items.map((item) => item.readiness.state)).toEqual(["blocked", "blocked"]);
    current.host.checks = { ...current.host.checks, isolationEnforceable: false };
    await current.adminCaller.saveSettings({ values: { enabled: true, docsProxyUrl: "https://docs.example.com", maxActiveActions: 1 }, expectedRevision: 0, idempotencyKey: key() });
    const after = await current.adminCaller.connections({});
    expect(after.sharedBlockers.filter((layer) => layer.state === "blocked").map((layer) => layer.reasonCode)).toEqual(["rootless_isolation_unavailable"]);
    expect(after.items.every((item) => item.readiness.blockedBy === "host")).toBe(true);
    current.host.checks = { ...current.host.checks, isolationEnforceable: true };
    const recovered = await current.adminCaller.connections({});
    expect(recovered.items.every((item) => item.readiness.state === "ready" && item.readiness.selectableModels === 1)).toBe(true);
    current.gateway.authenticated = false;
    expect((await current.adminCaller.connections({})).items[0]?.readiness).toMatchObject({ state: "blocked", reasonCode: "auth_required" });
  });
});
