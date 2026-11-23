import { readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const terminalStateDirectory = process.env.E2E_TERMINAL_STATE_DIR ?? join(tmpdir(), "flow-dev-e2e-terminal");
const SESSIONS_DIRECTORY = join(terminalStateDirectory, "flow-dev", "terminal-sessions");
const ATTACHMENT_LINE = /^- .+ \(.+\): (\/.+)$/;

export function sessionFolderOf(sessionId: string) {
  return join(SESSIONS_DIRECTORY, sessionId);
}

export function readSessionPrompt(sessionId: string) {
  return readFile(join(sessionFolderOf(sessionId), "prompt.md"), "utf8");
}

export function attachmentPathsOf(prompt: string) {
  return prompt.split("\n").flatMap((line) => ATTACHMENT_LINE.exec(line)?.[1] ?? []);
}

export async function sessionContextOf(sessionId: string) {
  const context = join(sessionFolderOf(sessionId), "contexto");
  return { attachments: await readdir(join(context, "anexos")), skills: await readdir(join(context, "skills")) };
}
