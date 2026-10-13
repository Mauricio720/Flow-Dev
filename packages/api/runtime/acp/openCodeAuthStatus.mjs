import { spawnSync } from "node:child_process";

const CREDENTIAL_COUNT = /\b([1-9]\d*) credentials?\b/i;
const result = spawnSync("opencode", ["auth", "list"], { encoding: "utf8", env: process.env, timeout: 5_000 });

if (result.error || result.status !== 0) {
  process.stderr.write("OpenCode authentication status could not be checked.\n");
  process.exit(1);
}

const output = `${result.stdout}\n${result.stderr}`;
process.stdout.write(JSON.stringify({ loggedIn: CREDENTIAL_COUNT.test(output) }));
