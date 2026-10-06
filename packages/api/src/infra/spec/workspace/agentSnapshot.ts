import { copyFile, lstat, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { GitRunner } from "./gitRunner";

const EXCLUDED = [/(^|\/)\.env(\..*)?$/i, /(^|\/)\.git(\/|$)/, /\.(pem|key|p12|pfx)$/i, /(^|\/)(credentials|secrets?)(\.|\/|$)/i, /(^|\/)id_(rsa|ed25519|ecdsa)(\.pub)?$/, /(^|\/)node_modules(\/|$)/, /(^|\/)\.next(\/|$)/];
const SNAPSHOT_TIMEOUT_MS = 60_000;

export const isAgentVisible = (path: string) => !EXCLUDED.some((pattern) => pattern.test(path));

export async function buildAgentSnapshot(input: { git: GitRunner; checkoutPath: string; target: string }) {
  const listing = await input.git({ args: ["ls-files", "-z"], cwd: input.checkoutPath, timeoutMs: SNAPSHOT_TIMEOUT_MS });
  const files = listing.stdout.split("\0").filter((path) => path && isAgentVisible(path));
  let copied = 0;
  for (const path of files) {
    const source = join(input.checkoutPath, path);
    if (!(await lstat(source)).isFile()) continue;
    const destination = join(input.target, path);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
    copied += 1;
  }
  return copied;
}
