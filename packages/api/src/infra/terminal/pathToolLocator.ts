import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { delimiter, join } from "node:path";
import type { ToolLocator } from "../../application/terminal/terminalLauncher";

async function isExecutableFile(path: string) {
  try {
    await access(path, constants.X_OK);
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

export class PathToolLocator implements ToolLocator {
  constructor(private readonly environment: NodeJS.ProcessEnv = process.env) {}

  async has(binary: string) {
    const directories = (this.environment.PATH ?? "").split(delimiter).filter(Boolean);
    for (const directory of directories) if (await isExecutableFile(join(directory, binary))) return true;
    return false;
  }
}
