import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CodexAccount, CodexDeviceLogin, CodexLoginDriver, CodexLoginProgress } from "./codexLoginDriver";

const run = promisify(execFile);
const URL_PATTERN = /https:\/\/[^\s"'<>]+/;
const URL_WAIT_MS = 10_000;
const LOGIN_TTL_MS = 15 * 60_000;
const SUBSCRIPTION_METHOD = "claude.ai";

type ClaudeStatus = { loggedIn?: boolean; authMethod?: string; email?: string | null; orgId?: string | null };
type Entry = { child: ChildProcess; home: string; exited: boolean };

function claudeEnvironment(home: string): NodeJS.ProcessEnv {
  return { PATH: process.env.PATH, HOME: process.env.HOME, CLAUDE_CONFIG_DIR: home } as unknown as NodeJS.ProcessEnv;
}

async function readStatus(command: string, home: string): Promise<ClaudeStatus> {
  try {
    const { stdout } = await run(command, ["auth", "status", "--json"], { env: claudeEnvironment(home) });
    return JSON.parse(stdout) as ClaudeStatus;
  } catch {
    return {};
  }
}

export class ClaudeLoginDriver implements CodexLoginDriver {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly command = "claude") {}

  async start(home: string): Promise<CodexDeviceLogin> {
    const child = spawn(this.command, ["auth", "login", "--claudeai"], { env: claudeEnvironment(home), stdio: ["ignore", "pipe", "pipe"] });
    const entry: Entry = { child, home, exited: false };
    child.on("exit", () => { entry.exited = true; });
    const verificationUrl = await this.captureUrl(child);
    if (!verificationUrl) {
      child.kill();
      throw new Error("setup_required");
    }
    const loginId = randomUUID();
    this.entries.set(loginId, entry);
    return { loginId, verificationUrl, userCode: "", expiresAt: new Date(Date.now() + LOGIN_TTL_MS) };
  }

  async progress(loginId: string): Promise<CodexLoginProgress> {
    const entry = this.entries.get(loginId);
    if (!entry) return "failed";
    if ((await readStatus(this.command, entry.home)).loggedIn) return "completed";
    return entry.exited ? "failed" : "pending";
  }

  async readAccount(home: string): Promise<CodexAccount | null> {
    const status = await readStatus(this.command, home);
    if (!status.loggedIn) return null;
    return { accountId: status.orgId ?? status.email ?? "claude", email: status.email ?? null, subscription: status.authMethod === SUBSCRIPTION_METHOD };
  }

  async cancel(loginId: string) {
    this.entries.get(loginId)?.child.kill();
    this.entries.delete(loginId);
  }

  private captureUrl(child: ChildProcess): Promise<string | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), URL_WAIT_MS);
      const onData = (chunk: Buffer) => {
        const match = URL_PATTERN.exec(chunk.toString("utf8"));
        if (!match) return;
        clearTimeout(timer);
        resolve(match[0]);
      };
      child.stdout?.on("data", onData);
      child.stderr?.on("data", onData);
      child.on("exit", () => resolve(null));
    });
  }
}
