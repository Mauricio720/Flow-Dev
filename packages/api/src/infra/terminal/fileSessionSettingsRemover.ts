import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { SessionSettingsRemover } from "../../application/terminal/sessionSettings";
import { UUID_PATTERN } from "../../application/terminal/uuidPattern";
import { terminalSessionsRoot } from "./terminalStateRoot";

const PRIVATE_DIRECTORY = "privado";
const SETTINGS_FILE = "settings.json";

export class FileSessionSettingsRemover implements SessionSettingsRemover {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async remove(sessionId: string): Promise<void> {
    if (!UUID_PATTERN.test(sessionId)) throw new Error("Identificador de sessão inválido");
    await rm(join(terminalSessionsRoot(this.env), sessionId, PRIVATE_DIRECTORY, SETTINGS_FILE), { force: true });
  }
}
