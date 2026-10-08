import { execFile } from "node:child_process";
import { lstat, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const CODEX_LOGIN_STATUS = "Logged in using ChatGPT";
const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

export async function codexChatGptLoginReady(home: string, status: (home: string) => Promise<boolean> = codexLoginStatus): Promise<boolean> {
  try {
    if (await realpath(home) !== resolve(home) || resolve(home) === join(homedir(), ".codex")) return false;
    const directory = await lstat(home);
    const credentials = await lstat(join(home, "auth.json"));
    const owner = process.getuid?.();
    if (owner === undefined || directory.uid !== owner || credentials.uid !== owner) return false;
    if (!directory.isDirectory() || !credentials.isFile()) return false;
    if ((directory.mode & 0o777) !== PRIVATE_DIRECTORY_MODE || (credentials.mode & 0o777) !== PRIVATE_FILE_MODE) return false;
    return await status(home);
  } catch { return false; }
}

async function codexLoginStatus(home: string) {
  const { stdout } = await run("codex", ["login", "status", "-c", "cli_auth_credentials_store=file"], { env: { PATH: process.env.PATH, HOME: process.env.HOME, CODEX_HOME: home } as unknown as NodeJS.ProcessEnv });
  return stdout.trim() === CODEX_LOGIN_STATUS;
}
