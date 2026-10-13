import { open, stat } from "node:fs/promises";
import { join } from "node:path";

export const DAEMON_LOG = "daemon.stderr.log";
const LOG_TAIL_BYTES = 16_384;
const ERROR_LINE = /\b(?:error|failed|fatal|panic)\b/i;
const ERROR_LEVEL_LINE = /"level":"(?:ERROR|FATAL)"|^(?:ERROR|FATAL|panic)\b/;

export async function daemonFailureDetail(runDirectory: string): Promise<string | null> {
  const path = join(runDirectory, DAEMON_LOG);
  const size = await stat(path).then((file) => file.size, () => 0);
  if (!size) return null;
  const handle = await open(path, "r");
  try {
    const length = Math.min(size, LOG_TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, size - length);
    const lines = buffer.subarray(0, bytesRead).toString("utf8").split(/\r?\n/);
    const recent = lines.reverse().map((line) => line.trim());
    return recent.find((line) => ERROR_LEVEL_LINE.test(line)) ?? recent.find((line) => ERROR_LINE.test(line)) ?? null;
  } finally {
    await handle.close();
  }
}
