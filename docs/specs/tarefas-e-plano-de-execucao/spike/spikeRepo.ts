import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SCRATCH } from "./paths";

export async function makeRepo(): Promise<string> {
  const repo = await mkdtemp(join(SCRATCH, "flow-v33-repo-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "ignore" });
  git("init", "-q");
  git("config", "user.email", "spike@example.com");
  git("config", "user.name", "Spike");
  await writeFile(join(repo, "README.md"), "# base\n");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return repo;
}
