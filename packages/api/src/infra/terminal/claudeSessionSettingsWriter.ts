import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SessionSettingsWriter } from "../../application/terminal/sessionSettings";
import { UUID_PATTERN } from "../../application/terminal/uuidPattern";
import { buildHookSettings } from "./claudeHookSettings";
import { terminalSessionsRoot } from "./terminalStateRoot";

const PRIVATE_DIRECTORY = "privado";
const SETTINGS_FILE = "settings.json";
const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

export class ClaudeSessionSettingsWriter implements SessionSettingsWriter {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async write(input: { sessionDir: string; token: string }): Promise<string> {
    const baseUrl = this.env.BETTER_AUTH_URL;
    if (!baseUrl) throw new Error("BETTER_AUTH_URL não configurada");
    const directory = join(input.sessionDir, PRIVATE_DIRECTORY);
    await mkdir(directory, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
    await chmod(directory, PRIVATE_DIRECTORY_MODE);
    const file = join(directory, SETTINGS_FILE);
    await writeFile(file, JSON.stringify(buildHookSettings({ baseUrl, token: input.token })), { mode: PRIVATE_FILE_MODE });
    await chmod(file, PRIVATE_FILE_MODE);
    return file;
  }

  async remove(sessionId: string): Promise<void> {
    if (!UUID_PATTERN.test(sessionId)) throw new Error("Identificador de sessão inválido");
    await rm(join(terminalSessionsRoot(this.env), sessionId, PRIVATE_DIRECTORY, SETTINGS_FILE), { force: true });
  }
}
