import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DrizzleTerminalAttachmentDao } from "../src/infra/database/dao/terminal/drizzleTerminalAttachmentDao";
import type { Database } from "../src/infra/database/client";
import { DiskAttachmentFileStore } from "../src/infra/terminal/diskAttachmentFileStore";
import { TerminalTaskFilesPurger } from "../src/infra/terminal/terminalTaskFilesPurger";

let stateRoot: string | undefined;

export async function terminalDeletionState(database: Database) {
  stateRoot = await mkdtemp(join(tmpdir(), "deletion-state-"));
  const terminalEnv = { XDG_STATE_HOME: stateRoot };
  const terminalFiles = new TerminalTaskFilesPurger(new DrizzleTerminalAttachmentDao(database), new DiskAttachmentFileStore(terminalEnv));
  return { terminalEnv, terminalFiles };
}

export async function removeTerminalDeletionState() {
  if (stateRoot) await rm(stateRoot, { recursive: true, force: true });
  stateRoot = undefined;
}
