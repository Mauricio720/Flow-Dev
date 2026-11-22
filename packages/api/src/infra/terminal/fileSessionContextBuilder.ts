import { chmod, cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SKILLS_PLUGIN_NAME } from "../../application/services/terminal/terminalPromptCopy";
import { FLOW_DEV_SKILLS, type SessionContextBuilder, type SessionContextPaths } from "../../application/terminal/sessionContext";
import { UUID_PATTERN } from "../../application/terminal/uuidPattern";
import { flowDevSkillsDir } from "./flowDevSkillsDir";
import { terminalSessionsRoot } from "./terminalStateRoot";

const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const SKILL_FILE = "SKILL.md";
const PLUGIN_MANIFEST_DIRECTORY = ".claude-plugin";
const PLUGIN_MANIFEST_FILE = "plugin.json";
const PLUGIN_MANIFEST = { name: SKILLS_PLUGIN_NAME, version: "1.0.0", description: "Skills do Flow Dev para esta sessão" };

async function isFile(path: string) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function privateDirectory(path: string) {
  await mkdir(path, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
  await chmod(path, PRIVATE_DIRECTORY_MODE);
}

export class FileSessionContextBuilder implements SessionContextBuilder {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env, private readonly cwd: string = process.cwd()) {}

  async missingSkills() {
    const source = await flowDevSkillsDir(this.env, this.cwd);
    const present = await Promise.all(FLOW_DEV_SKILLS.map(async (skill) => !!source && await isFile(join(source, skill, SKILL_FILE))));
    return FLOW_DEV_SKILLS.filter((_skill, index) => !present[index]);
  }

  async prepare(sessionId: string): Promise<SessionContextPaths> {
    const sessionDir = this.sessionDirectory(sessionId);
    const contextDir = join(sessionDir, "contexto");
    const attachmentsDir = join(contextDir, "anexos");
    await privateDirectory(sessionDir);
    await privateDirectory(attachmentsDir);
    await this.writeManifest(contextDir);
    await this.copySkills(contextDir);
    return { sessionDir, contextDir, attachmentsDir };
  }

  async discard(sessionId: string) {
    await rm(this.sessionDirectory(sessionId), { recursive: true, force: true });
  }

  private sessionDirectory(sessionId: string) {
    if (!UUID_PATTERN.test(sessionId)) throw new Error("Identificador de sessão inválido");
    return join(terminalSessionsRoot(this.env), sessionId);
  }

  private async writeManifest(contextDir: string) {
    const directory = join(contextDir, PLUGIN_MANIFEST_DIRECTORY);
    await privateDirectory(directory);
    await writeFile(join(directory, PLUGIN_MANIFEST_FILE), JSON.stringify(PLUGIN_MANIFEST), { mode: PRIVATE_FILE_MODE });
  }

  private async copySkills(contextDir: string) {
    const source = await flowDevSkillsDir(this.env, this.cwd);
    if (!source) throw new Error("Pasta de skills do Flow Dev não encontrada");
    const target = join(contextDir, "skills");
    await privateDirectory(target);
    for (const skill of FLOW_DEV_SKILLS) await cp(join(source, skill), join(target, skill), { recursive: true });
  }
}
