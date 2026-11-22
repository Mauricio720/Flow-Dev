import { constants } from "node:fs";
import { chmod, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { AttachmentFileStore, CopyToSessionInput } from "../../application/terminal/attachmentFileStore";
import { UUID_PATTERN } from "../../application/terminal/uuidPattern";
import { terminalSessionsRoot, terminalStagingRoot } from "./terminalStateRoot";

const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const TARGET_NAME_PATTERN = /^[a-z0-9][a-z0-9.-]*$/;

function requireIdentifier(value: string) {
  if (!UUID_PATTERN.test(value)) throw new Error("Identificador inválido");
  return value;
}

function requireTargetName(value: string) {
  if (!TARGET_NAME_PATTERN.test(value) || value.includes("..")) throw new Error("Nome de anexo inválido");
  return value;
}

async function privateDirectory(path: string) {
  await mkdir(path, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
  await chmod(path, PRIVATE_DIRECTORY_MODE);
}

export class DiskAttachmentFileStore implements AttachmentFileStore {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async writeStaged(userId: string, storedName: string, content: Uint8Array) {
    await privateDirectory(this.userDirectory(userId));
    await writeFile(this.stagedPath(userId, storedName), content, { mode: PRIVATE_FILE_MODE, flag: "wx" });
  }

  async readStaged(userId: string, storedName: string) {
    return new Uint8Array(await readFile(this.stagedPath(userId, storedName)));
  }

  async removeStaged(userId: string, storedName: string) {
    await rm(this.stagedPath(userId, storedName), { force: true });
  }

  async copyToSession(input: CopyToSessionInput) {
    const target = this.sessionFilePath(input.attachmentsDir, input.targetName);
    await copyFile(this.stagedPath(input.userId, input.storedName), target, constants.COPYFILE_EXCL);
    await chmod(target, PRIVATE_FILE_MODE);
    return target;
  }

  async writeSessionFile(attachmentsDir: string, targetName: string, content: Uint8Array) {
    const target = this.sessionFilePath(attachmentsDir, targetName);
    await writeFile(target, content, { mode: PRIVATE_FILE_MODE });
    await chmod(target, PRIVATE_FILE_MODE);
    return target;
  }

  async removeSessionDir(sessionId: string) {
    await rm(join(terminalSessionsRoot(this.env), requireIdentifier(sessionId)), { recursive: true, force: true });
  }

  private userDirectory(userId: string) {
    return join(terminalStagingRoot(this.env), requireIdentifier(userId));
  }

  private stagedPath(userId: string, storedName: string) {
    return join(this.userDirectory(userId), requireIdentifier(storedName));
  }

  private sessionFilePath(attachmentsDir: string, targetName: string) {
    const root = resolve(terminalSessionsRoot(this.env));
    const directory = resolve(attachmentsDir);
    if (relative(root, directory).startsWith("..")) throw new Error("Pasta de anexos fora das sessões");
    return join(directory, requireTargetName(targetName));
  }
}
