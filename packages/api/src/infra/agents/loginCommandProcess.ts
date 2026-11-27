import { spawn } from "node:child_process";
import { killGroup } from "./processGroup";

export type LoginCommandResult = { stdout: string; stderr: string };

export function runLoginCommand(command: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<LoginCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, detached: process.platform !== "win32", shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (child.pid && process.platform !== "win32") void killGroup(child.pid);
      else child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    child.once("error", (error) => settle(() => reject(error)));
    child.once("close", () => {
      if (timedOut) settle(() => reject(Object.assign(new Error("login_check_timeout"), { code: "ETIMEDOUT", killed: true, stdout, stderr })));
      else settle(() => resolve({ stdout, stderr }));
    });
    function settle(action: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      action();
    }
  });
}
