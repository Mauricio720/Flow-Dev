import { spawn } from "node:child_process";
import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { RuntimeLaunch, SpecRuntimeLauncher } from "../../application/spec/specRuntimeLauncher";
import { TaskError } from "../../application/services/tasks/taskErrors";
import { buildContainerArguments } from "./containerPlan";
import type { SpecConfiguration } from "./specConfiguration";

export type CommandRunner = (command: string, args: string[]) => Promise<void>;
const SOCKET_WAIT_ATTEMPTS = 50;
const SOCKET_WAIT_MS = 200;
const SOCKET_FILE = "daemon.sock";

export const runCommand: CommandRunner = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: "ignore" });
  child.on("error", () => reject(new TaskError("workspace_unavailable")));
  child.on("close", (code) => (code === 0 ? resolve() : reject(new TaskError("workspace_unavailable"))));
});

export class PodmanRuntimeLauncher implements SpecRuntimeLauncher {
  constructor(private readonly configuration: SpecConfiguration, private readonly run: CommandRunner = runCommand) {}

  socketPath(attemptId: string) {
    return join(this.configuration.runtimeRoot, attemptId, SOCKET_FILE);
  }

  async start(input: RuntimeLaunch) {
    const socketDirectory = join(this.configuration.runtimeRoot, input.attemptId);
    await mkdir(socketDirectory, { recursive: true });
    if (await this.socketExists(input.attemptId)) return { socketPath: this.socketPath(input.attemptId) };
    await this.run("podman", buildContainerArguments({ configuration: this.configuration, attemptId: input.attemptId, snapshotPath: input.snapshotPath, inputsPath: input.workspace.inputsPath, candidatePath: input.workspace.candidatePath, scratchPath: input.workspace.scratchPath, socketDirectory }));
    await this.waitForSocket(this.socketPath(input.attemptId));
    return { socketPath: this.socketPath(input.attemptId) };
  }

  async stop(attemptId: string) {
    await this.run("podman", ["rm", "--force", "--ignore", `flow-spec-${attemptId}`]);
    await rm(join(this.configuration.runtimeRoot, attemptId), { recursive: true, force: true });
  }

  private socketExists(attemptId: string) { return stat(this.socketPath(attemptId)).then(() => true, () => false); }

  private async waitForSocket(path: string) {
    for (let attempt = 0; attempt < SOCKET_WAIT_ATTEMPTS; attempt += 1) {
      if (await stat(path).then(() => true, () => false)) return;
      await new Promise((resolve) => setTimeout(resolve, SOCKET_WAIT_MS));
    }
    throw new TaskError("runtime_incompatible");
  }
}
