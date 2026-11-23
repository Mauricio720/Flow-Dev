import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function killChildProcesses(parentPid: number = process.pid) {
  const children = await execFileAsync("pgrep", ["-P", String(parentPid)]).then((result) => result.stdout.split("\n").filter(Boolean).map(Number), () => []);
  for (const pid of children) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      continue;
    }
  }
}
