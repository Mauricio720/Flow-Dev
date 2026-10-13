import { execFile } from "node:child_process";
import { dirname } from "node:path";
import { promisify } from "node:util";
import type { ControlResult } from "../../../application/software/controlErrors";
import { compozyCommand, matchesCompozyPin } from "../../local-execution/pinnedCompozy";
import { ControlCaller } from "./controlCaller";
import { unixSocketTransport } from "./compozyTransport";

const execute = promisify(execFile);
const START_TIMEOUT_MS = 30_000;
type StartupInput = { executable: string; socketPath: string; environment: NodeJS.ProcessEnv };
type StartupDependencies = { check(): Promise<ControlResult<string>>; start(input: StartupInput): Promise<void> };

async function startDaemon(input: StartupInput) {
  if (!await matchesCompozyPin(input.executable)) throw new Error("managed_runtime_incompatible");
  await execute(input.executable, ["daemon", "start"], {
    timeout: START_TIMEOUT_MS,
    env: { ...input.environment, COMPOZY_HOME: dirname(input.socketPath) },
  });
}

function dependencies(environment: NodeJS.ProcessEnv, socketPath: string): StartupDependencies {
  const caller = new ControlCaller({ transport: unixSocketTransport(socketPath), declaredOpenApiSha256: environment.SPEC_COMPOZY_OPENAPI_SHA256?.trim() ?? "" });
  return { check: () => caller.verifyRelease(), start: startDaemon };
}

export async function ensureManagedRuntime(environment: NodeJS.ProcessEnv, supplied?: StartupDependencies) {
  const socketPath = environment.SOFTWARE_COMPOZY_SOCKET?.trim();
  if (!socketPath) return false;
  const deps = supplied ?? dependencies(environment, socketPath);
  const current = await deps.check();
  if (current.ok) return true;
  if (current.code !== "service_unavailable") throw new Error("managed_runtime_incompatible");
  await deps.start({ executable: compozyCommand(environment), socketPath, environment });
  const ready = await deps.check();
  if (!ready.ok) throw new Error("managed_runtime_unavailable");
  return true;
}
