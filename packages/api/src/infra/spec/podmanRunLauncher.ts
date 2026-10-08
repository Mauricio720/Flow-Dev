import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ExecutionRequest } from "../../application/services/task-flow/actionExecutor";
import type { RunLauncher } from "./compozy/snapshotRunExecutor";
import { runCommand, type CommandRunner } from "./podmanLauncher";
import { buildRunContainerArguments } from "./runContainerPlan";
import { providersEnvironment, snapshotProviders } from "./runProviders";
import type { RunWorkspaceProvider } from "./runWorkspaceProvider";
import { TaskError } from "../../application/services/tasks/taskErrors";

export type RunLauncherConfiguration = { runtimeRoot: string; runtimeImage: string; docsProxyUrl: string };

const SOCKET_WAIT_ATTEMPTS = 50;
const SOCKET_WAIT_MS = 200;
const SOCKET_FILE = "daemon.sock";

export class PodmanRunLauncher implements RunLauncher {
  constructor(private readonly configuration: RunLauncherConfiguration, private readonly workspaces: RunWorkspaceProvider, private readonly run: CommandRunner = runCommand) {}

  async start(request: ExecutionRequest) {
    const socketDirectory = join(this.configuration.runtimeRoot, "runs", request.run.id);
    const socketPath = join(socketDirectory, SOCKET_FILE);
    await mkdir(socketDirectory, { recursive: true });
    if (await exists(socketPath)) return { socketPath };
    const workspace = await this.workspaces.prepare(request);
    const grants = request.grants.map((grant) => ({ connectionId: grant.connectionId, mountPath: grant.mountPath }));
    const providers = providersEnvironment(snapshotProviders(request.snapshot));
    await this.run("podman", buildRunContainerArguments({ runId: request.run.id, image: this.configuration.runtimeImage, docsProxyUrl: this.configuration.docsProxyUrl, ...workspace, socketDirectory, grants, providers }));
    await waitFor(socketPath);
    return { socketPath };
  }

  async stop(runId: string) {
    await this.run("podman", ["rm", "--force", "--ignore", `flow-run-${runId}`]);
    await rm(join(this.configuration.runtimeRoot, "runs", runId), { recursive: true, force: true });
  }
}

const exists = (path: string) => stat(path).then(() => true, () => false);

async function waitFor(path: string) {
  for (let attempt = 0; attempt < SOCKET_WAIT_ATTEMPTS; attempt += 1) {
    if (await exists(path)) return;
    await new Promise((resolve) => setTimeout(resolve, SOCKET_WAIT_MS));
  }
  throw new TaskError("runtime_incompatible");
}
