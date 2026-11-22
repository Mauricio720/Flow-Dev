import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function withAgentDirectory<T>(use: (directory: string) => Promise<T>) {
  const directory = await mkdtemp(join(tmpdir(), "flow-agent-"));
  try { return await use(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}
