import { chmod, lstat, mkdir, readlink, readdir, rm, stat, symlink } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { UUID_PATTERN } from "../../application/terminal/uuidPattern";
import type { AgentAccountHome, AgentAccountIdentity } from "../../application/agent-accounts/agentAccountHome";
import { allowedConfigNames } from "./accountConfigLinks";
import { removeAccountHome } from "./fileAgentAccountHomeLogout";

const STATE_DIRECTORY = "flow-dev";
const ACCOUNTS_DIRECTORY = "agent-accounts";
const DEFAULT_STATE_DIRECTORY = join(".local", "state");

export class FileAgentAccountHome implements AgentAccountHome {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  pathOf(account: Pick<AgentAccountIdentity, "id">) {
    if (!UUID_PATTERN.test(account.id)) throw new Error("Identificador de conta inválido");
    return join(stateHome(this.env), STATE_DIRECTORY, ACCOUNTS_DIRECTORY, account.id);
  }

  async ensure(account: AgentAccountIdentity) {
    const home = this.pathOf(account);
    await mkdir(home, { recursive: true, mode: 0o700 });
    await chmod(home, 0o700);
    const root = personalConfigRoot(account.provider, this.env);
    const names = await existingNames(root, account.provider);
    await syncConfigLinks(home, root, names);
    return home;
  }

  logoutAndDelete(account: AgentAccountIdentity) {
    return removeAccountHome(this.env, this.pathOf(account), account.provider);
  }
}

function stateHome(env: NodeJS.ProcessEnv) {
  const configured = env.XDG_STATE_HOME;
  if (configured && isAbsolute(configured)) return configured;
  return join(env.HOME || homedir(), DEFAULT_STATE_DIRECTORY);
}

function personalConfigRoot(provider: AgentAccountIdentity["provider"], env: NodeJS.ProcessEnv) {
  if (provider === "claude") return env.CLAUDE_CONFIG_DIR || join(env.HOME || homedir(), ".claude");
  return env.CODEX_HOME || join(env.HOME || homedir(), ".codex");
}

async function existingNames(root: string, provider: AgentAccountIdentity["provider"]) {
  let entries: string[] = [];
  try { entries = await readdir(root); } catch { return []; }
  return allowedConfigNames(provider, entries).filter((name) => entries.includes(name));
}

async function syncConfigLinks(home: string, root: string, names: string[]) {
  for (const name of names) await syncConfigLink(home, join(root, name), name);
  const existing = await readdir(home);
  for (const name of existing) {
    if (!names.includes(name) && (await lstat(join(home, name))).isSymbolicLink()) await rm(join(home, name));
  }
}

async function syncConfigLink(home: string, target: string, name: string) {
  try {
    const info = await stat(target);
    if (!info.isFile() && !info.isDirectory()) return;
    const link = join(home, name);
    try {
      if ((await lstat(link)).isSymbolicLink() && await readlink(link) === target) return;
      if ((await lstat(link)).isSymbolicLink()) await rm(link);
      else return;
    } catch {}
    await symlink(target, link, info.isDirectory() ? "dir" : "file");
  } catch {}
}
