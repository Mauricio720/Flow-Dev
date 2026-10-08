import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CodexAccount, CodexLoginDriver, CodexLoginProgress } from "./codexLoginDriver";
import { HostCredentialBroker } from "./credentialBroker";
import { CredentialHomes } from "./credentialHomes";

const LOGIN_TTL_MS = 600_000;
const ACCOUNT: CodexAccount = { accountId: "acct-1", email: "maria@example.com", subscription: true };

class FakeDriver implements CodexLoginDriver {
  progressValue: CodexLoginProgress = "pending";
  account: CodexAccount | null = ACCOUNT;
  credentialText = "{}";
  cancelled: string[] = [];
  constructor(private readonly clock: () => Date) {}
  async start(home: string) {
    await writeFile(join(home, "auth.json"), this.credentialText);
    const expiresAt = new Date(this.clock().getTime() + LOGIN_TTL_MS);
    return { loginId: "login-1", verificationUrl: "https://auth.example/device", userCode: "ABCD-1234", expiresAt };
  }
  async progress() { return this.progressValue; }
  async readAccount() { return this.account; }
  async cancel(loginId: string) { this.cancelled.push(loginId); }
}

let root: string;
let current = new Date("2026-10-06T12:00:00Z");
let driver: FakeDriver;
let broker: HostCredentialBroker;
const connectionId = randomUUID();

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "broker-"));
  current = new Date("2026-10-06T12:00:00Z");
  driver = new FakeDriver(() => current);
  broker = new HostCredentialBroker({ homes: new CredentialHomes(root), driver, now: () => current });
});
afterEach(() => rm(root, { recursive: true, force: true }));

async function connect(operationId = randomUUID()) {
  await broker.beginCodexLogin({ connectionId, operationId });
  driver.progressValue = "completed";
  return broker.confirmLogin(operationId);
}

describe("host credential broker", () => {
  it("UT-005 keeps the prior revision when the login operation expired", async () => {
    const first = await connect();
    expect(first).toMatchObject({ state: "confirmed", credentialRevision: 1 });
    const operationId = randomUUID();
    await broker.beginCodexLogin({ connectionId, operationId });
    driver.progressValue = "pending";
    current = new Date(current.getTime() + LOGIN_TTL_MS + 1);
    const expired = await broker.confirmLogin(operationId);
    expect(expired).toMatchObject({ state: "expired", credentialRevision: 1 });
    expect(driver.cancelled).toEqual(["login-1"]);
    expect(await broker.grantForAttempt({ connectionId, attemptId: randomUUID() })).toBeTruthy();
  });

  it("UT-006 returns the existing revision for a duplicate confirmed completion", async () => {
    const operationId = randomUUID();
    const first = await connect(operationId);
    const duplicate = await broker.confirmLogin(operationId);
    expect(duplicate).toEqual(first);
    expect(await broker.pollLogin(operationId)).toEqual(first);
  });

  it("reports a safe identity and never an auth detail", async () => {
    const status = await connect();
    if (status.state !== "confirmed") throw new Error("expected confirmed");
    expect(status.identity.label).toBe("m***@example.com");
    expect(JSON.stringify(status)).not.toContain("maria@");
    expect(JSON.stringify(status)).not.toContain(root);
  });

  it("rejects an account without a subscription and discards the staged home", async () => {
    driver.account = { accountId: "acct-2", email: null, subscription: false };
    const operationId = randomUUID();
    await broker.beginCodexLogin({ connectionId, operationId });
    driver.progressValue = "completed";
    expect(await broker.confirmLogin(operationId)).toMatchObject({ state: "failed", code: "auth_ineligible" });
    await expect(stat(join(root, "staging", operationId))).rejects.toThrow();
  });

  it("requires explicit confirmation before swapping and refuses overlapping logins", async () => {
    const operationId = randomUUID();
    await broker.beginCodexLogin({ connectionId, operationId });
    driver.progressValue = "completed";
    expect(await broker.pollLogin(operationId)).toMatchObject({ state: "awaiting_confirmation", credentialRevision: 0 });
    await expect(stat(join(root, "connections", connectionId))).rejects.toThrow();
    await expect(broker.beginCodexLogin({ connectionId, operationId: randomUUID() })).rejects.toThrow("login_in_progress");
  });

  it("grants an attempt-scoped copy and revokes it", async () => {
    await connect();
    const attemptId = randomUUID();
    const grant = await broker.grantForAttempt({ connectionId, attemptId });
    expect(await readFile(join(grant.mountPath, "auth.json"), "utf8")).toBe("{}");
    expect(((await stat(grant.mountPath)).mode & 0o777)).toBe(0o700);
    await broker.releaseGrant(attemptId);
    await expect(stat(grant.mountPath)).rejects.toThrow();
    await broker.disconnect(connectionId);
    await expect(broker.grantForAttempt({ connectionId, attemptId })).rejects.toThrow("auth_required");
  });

  it("UT-008 restores the previous home after a failed reconnect and supports rollback-safe disconnect", async () => {
    const firstOperation = randomUUID();
    await connect(firstOperation);
    await broker.completeLogin(firstOperation);
    driver.credentialText = "{\"revision\":2}";
    const reconnectOperation = randomUUID();
    await broker.beginCodexLogin({ connectionId, operationId: reconnectOperation });
    driver.progressValue = "completed";
    await broker.confirmLogin(reconnectOperation);
    await broker.rollbackLogin(reconnectOperation);
    const firstGrant = await broker.grantForAttempt({ connectionId, attemptId: randomUUID() });
    expect(await readFile(join(firstGrant.mountPath, "auth.json"), "utf8")).toBe("{}");
    await broker.releaseGrant(firstGrant.attemptId);
    await broker.disconnect(connectionId);
    await broker.rollbackDisconnect(connectionId);
    const restoredGrant = await broker.grantForAttempt({ connectionId, attemptId: randomUUID() });
    expect(await readFile(join(restoredGrant.mountPath, "auth.json"), "utf8")).toBe("{}");
  });

  it("rejects non-opaque identifiers", async () => {
    await expect(broker.beginCodexLogin({ connectionId: "../etc", operationId: randomUUID() })).rejects.toThrow("invalid_opaque_id");
  });
});
