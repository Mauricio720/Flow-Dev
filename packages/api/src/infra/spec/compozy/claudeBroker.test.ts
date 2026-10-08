import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CodexAccount, CodexLoginDriver, CodexLoginProgress } from "./codexLoginDriver";
import { HostCredentialBroker } from "./credentialBroker";
import { CredentialHomes } from "./credentialHomes";

const FILE_BY_KIND = { codex: "auth.json", claude: ".credentials.json" } as const;

class FakeDriver implements CodexLoginDriver {
  account: CodexAccount | null = { accountId: "org-1", email: "ana@example.com", subscription: true };
  constructor(private readonly file: string) {}
  async start(home: string) {
    await writeFile(join(home, this.file), "{}");
    return { loginId: randomUUID(), verificationUrl: "https://claude.example/login", userCode: "", expiresAt: new Date(Date.now() + 600_000) };
  }
  async progress(): Promise<CodexLoginProgress> { return "completed"; }
  async readAccount() { return this.account; }
  async cancel() {}
}

let root: string;
let claude: FakeDriver;
let broker: HostCredentialBroker;
const connectionId = randomUUID();

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "claude-broker-"));
  claude = new FakeDriver(FILE_BY_KIND.claude);
  broker = new HostCredentialBroker({ homes: new CredentialHomes(root), driver: new FakeDriver(FILE_BY_KIND.codex), claudeDriver: claude });
});
afterEach(() => rm(root, { recursive: true, force: true }));

describe("claude credential broker", () => {
  it("UT-007 reports auth_ineligible for API billing and never switches modes or promotes the home", async () => {
    claude.account = { accountId: "org-1", email: "ana@example.com", subscription: false };
    const operationId = randomUUID();
    await broker.beginClaudeLogin({ connectionId, operationId });
    expect(await broker.confirmLogin(operationId)).toMatchObject({ state: "failed", code: "auth_ineligible" });
    await expect(stat(join(root, "connections", connectionId))).rejects.toThrow();
    await expect(broker.grantForAttempt({ connectionId, attemptId: randomUUID() })).rejects.toThrow("auth_required");
  });

  it("stays setup_required when no supervised Claude ceremony is available", async () => {
    const withoutClaude = new HostCredentialBroker({ homes: new CredentialHomes(root), driver: new FakeDriver(FILE_BY_KIND.codex) });
    await expect(withoutClaude.beginClaudeLogin({ connectionId, operationId: randomUUID() })).rejects.toThrow("setup_required");
  });

  it("IT-081 keeps Claude and Codex credentials in separate homes and grants only the requested one", async () => {
    const codexConnection = randomUUID();
    for (const [kind, id] of [["codex", codexConnection], ["claude", connectionId]] as const) {
      const operationId = randomUUID();
      await (kind === "codex" ? broker.beginCodexLogin({ connectionId: id, operationId }) : broker.beginClaudeLogin({ connectionId: id, operationId }));
      expect(await broker.confirmLogin(operationId)).toMatchObject({ state: "confirmed" });
    }
    const grant = await broker.grantForAttempt({ connectionId, attemptId: randomUUID() });
    expect(await readFile(join(grant.mountPath, ".credentials.json"), "utf8")).toBe("{}");
    await expect(stat(join(grant.mountPath, "auth.json"))).rejects.toThrow();
    await broker.disconnect(codexConnection);
    expect(await broker.grantForAttempt({ connectionId, attemptId: randomUUID() })).toBeTruthy();
  });
});
