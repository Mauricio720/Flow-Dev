import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ToolLocator } from "../../../application/terminal/toolLocator";
import { killGroup } from "../../agents/processGroup";
import { credentialEnvironment } from "../../agents/agentEnvironment";

export const CODEX_FAKE_SCRIPT_VARIABLE = "FLOW_DEV_CODEX_FAKE_SCRIPT";
const FAKE_SERVER_SEGMENTS = ["..", "..", "..", "..", "test", "support", "scriptedCodexAppServer.ts"];

export class CodexProcess {
  constructor(private readonly locator: ToolLocator & { locate(binary: string): Promise<string | null> }, private readonly env: NodeJS.ProcessEnv = process.env) {}

  async start(input: { credentialHome?: string } = {}): Promise<ChildProcess> {
    const script = this.env[CODEX_FAKE_SCRIPT_VARIABLE];
    const env = input.credentialHome ? { ...this.env, ...credentialEnvironment("codex", input.credentialHome) } : this.env;
    if (script) return this.startFake(script, env);
    const binary = await this.locator.locate("codex");
    if (!binary) throw new Error("Codex executable was not found in PATH");
    return spawn(binary, ["app-server"], { stdio: ["pipe", "pipe", "ignore"], detached: process.platform !== "win32", shell: false, env });
  }

  async terminate(child: ChildProcess) {
    if (child.pid && process.platform !== "win32") await killGroup(child.pid);
    else child.kill("SIGTERM");
  }

  private startFake(script: string, env: NodeJS.ProcessEnv) {
    if (this.env.NODE_ENV !== "test") throw new Error(`${CODEX_FAKE_SCRIPT_VARIABLE} is restricted to NODE_ENV=test`);
    return spawn(process.execPath, ["--import", "tsx", fakeServerPath(), script], { stdio: ["pipe", "pipe", "ignore"], detached: process.platform !== "win32", shell: false, env });
  }
}

function fakeServerPath() {
  return join(dirname(fileURLToPath(import.meta.url)), ...FAKE_SERVER_SEGMENTS);
}
