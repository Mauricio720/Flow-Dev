import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import type { TerminalCommand, TerminalLauncher } from "../../application/terminal/terminalLauncher";
import { terminalEnvironment } from "./terminalEnvironment";

export const LAUNCH_SETTLE_MS = 5000;
export type LaunchedProcess = Pick<ChildProcess, "once" | "unref">;
export type SpawnProcess = (file: string, args: string[], options: SpawnOptions) => LaunchedProcess;

export class TerminalLaunchError extends Error {}

export class GnomeTerminalLauncher implements TerminalLauncher {
  constructor(private readonly spawnProcess: SpawnProcess = spawn, private readonly environment: NodeJS.ProcessEnv = process.env) {}

  launch(command: TerminalCommand) {
    return new Promise<void>((resolve, reject) => {
      const options: SpawnOptions = { detached: true, stdio: "ignore", shell: false, env: terminalEnvironment(this.environment) };
      const child = this.spawnProcess(command.file, command.args, options);
      const settle = setTimeout(resolve, LAUNCH_SETTLE_MS);
      settle.unref();
      child.once("error", (error) => reject(new TerminalLaunchError(error.message)));
      child.once("exit", (code) => (code ? reject(new TerminalLaunchError(`${command.file} saiu com código ${code}`)) : resolve()));
      child.unref();
    });
  }
}
