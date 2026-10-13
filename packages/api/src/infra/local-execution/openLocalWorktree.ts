import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { LocalExecutionError } from "../../application/services/local-execution/localExecutionErrors";

const execute = promisify(execFile);

export async function openLocalWorktree(path: string): Promise<void> {
  await execute("code", ["--new-window", path], { timeout: 20_000, maxBuffer: 1024 }).catch(() => {
    throw new LocalExecutionError("runtime_failed");
  });
}
