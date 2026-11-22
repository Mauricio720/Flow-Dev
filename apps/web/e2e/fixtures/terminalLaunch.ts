import { readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const terminalStateDirectory = process.env.E2E_TERMINAL_STATE_DIR ?? join(tmpdir(), "flow-dev-e2e-terminal");
const LAUNCH_RECORD = join(terminalStateDirectory, "launch.json");
const ATTACHMENT_LINE = /^- .+ \(.+\): (\/.+)$/;

export type RecordedLaunch = { file: string; args: string[] };

export async function clearRecordedLaunch() {
  await rm(LAUNCH_RECORD, { force: true });
}

export async function readRecordedLaunch() {
  return JSON.parse(await readFile(LAUNCH_RECORD, "utf8")) as RecordedLaunch;
}

export function attachmentPathsOf(prompt: string) {
  return prompt.split("\n").flatMap((line) => ATTACHMENT_LINE.exec(line)?.[1] ?? []);
}

export async function sessionContextOf(prompt: string) {
  const [firstAttachment] = attachmentPathsOf(prompt);
  const attachments = dirname(firstAttachment ?? "");
  const context = dirname(attachments);
  return { attachments: await readdir(attachments), skills: await readdir(join(context, "skills")) };
}
