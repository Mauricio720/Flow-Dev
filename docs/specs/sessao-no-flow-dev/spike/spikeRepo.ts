import { execFileSync } from "node:child_process";
import { cp, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { REPO_ROOT, SCRATCH, SKILLS } from "./paths";

export async function makeRepo(extraFiles: Record<string, string> = {}): Promise<string> {
  const repo = await mkdtemp(join(SCRATCH, "flow-v20-repo-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "ignore" });
  git("init", "-q");
  git("config", "user.email", "spike@example.com");
  git("config", "user.name", "Spike");
  await writeFile(join(repo, "README.md"), "# base\n");
  for (const [path, content] of Object.entries(extraFiles)) {
    await mkdir(join(repo, path, ".."), { recursive: true });
    await writeFile(join(repo, path), content);
  }
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return repo;
}

export async function makePlugin(): Promise<string> {
  const contextDir = await mkdtemp(join(SCRATCH, "flow-v20-contexto-"));
  await mkdir(join(contextDir, ".claude-plugin"), { recursive: true });
  const manifest = { name: "flow-dev", version: "1.0.0", description: "Skills do Flow Dev para esta sessão" };
  await writeFile(join(contextDir, ".claude-plugin", "plugin.json"), JSON.stringify(manifest));
  for (const skill of SKILLS) await cp(join(REPO_ROOT, ".claude", "skills", skill), join(contextDir, "skills", skill), { recursive: true });
  return contextDir;
}
