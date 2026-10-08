import { afterEach, describe, expect, it } from "vitest";
import { failureOf, key, softwareFixture, type SoftwareFixture } from "./software-support";

let current: SoftwareFixture | undefined;
afterEach(async () => { await current?.close(); current = undefined; });

describe("claude connection", () => {
  it("IT-078 and IT-081 connect a Claude subscription as a distinct provider row", async () => {
    current = await softwareFixture();
    const start = await current.adminCaller.beginClaudeLogin({ label: "Claude pessoal", idempotencyKey: key() });
    expect(start).toMatchObject({ state: "started", verificationUrl: "https://auth.example/device" });
    if (start.state !== "started") return;
    current.broker.authenticate(start.operationId);
    expect(await current.adminCaller.pollLogin({ operationId: start.operationId })).toMatchObject({ state: "awaiting_confirmation" });
    await current.adminCaller.confirmAccount({ operationId: start.operationId, expectedConnectionRevision: start.connectionRevision });
    const codex = await current.adminCaller.beginCodexLogin({ label: "Codex", idempotencyKey: key() });
    const rows = (await current.adminCaller.connections({})).items;
    expect(rows.map((row) => [row.label, row.providerKind, row.authState])).toEqual([["Claude pessoal", "claude", "connected"], ["Codex", "codex", "pending"]]);
    expect(codex.connectionId).not.toBe(start.connectionId);
    const [{ provider }] = await current.client`SELECT runtime_provider_id AS provider FROM software_connections WHERE label='Claude pessoal'`;
    expect(provider).toMatch(/^claude-[0-9a-f]{12}$/);
  });

  it("IT-079 reports setup_required honestly when no supervised completion path exists and never claims a connection", async () => {
    current = await softwareFixture();
    current.broker.setupRequired = true;
    const result = await current.adminCaller.beginClaudeLogin({ label: "Claude", idempotencyKey: key() });
    expect(result).toMatchObject({ state: "setup_required" });
    const [row] = (await current.adminCaller.connections({})).items;
    expect(row).toMatchObject({ providerKind: "claude", authState: "setup_required", readiness: { state: "blocked" } });
    const retry = await current.adminCaller.beginClaudeLogin({ connectionId: row!.id, idempotencyKey: key() });
    expect(retry).toMatchObject({ state: "setup_required" });
  });

  it("IT-084 denies non-administrators and refuses to start Claude login on a Codex connection", async () => {
    current = await softwareFixture();
    expect(await failureOf(current.memberCaller.beginClaudeLogin({ label: "X", idempotencyKey: key() }))).toMatchObject({ code: "FORBIDDEN" });
    const codex = await current.adminCaller.beginCodexLogin({ label: "Codex", idempotencyKey: key() });
    expect(await failureOf(current.adminCaller.beginClaudeLogin({ connectionId: codex.connectionId, idempotencyKey: key() }))).toMatchObject({ reason: "provider_unsupported" });
  });
});
