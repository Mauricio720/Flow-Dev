import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import type { FolderPick, FolderPicker } from "../../application/terminal/folderPicker";
import { terminalEnvironment } from "./terminalEnvironment";

export const ZENITY_BINARY = "zenity";
export const FOLDER_DIALOG_TITLE = "Escolha a pasta do clone";
export const FOLDER_DIALOG_TIMEOUT_MS = 300_000;
const CANCELLED_EXIT_CODE = 1;
const TRAILING_NEWLINE = /\r?\n$/;

export type PickerProcess = Pick<ChildProcess, "once" | "kill" | "stdout">;
export type SpawnPicker = (file: string, args: string[], options: SpawnOptions) => PickerProcess;

export function folderDialogArgs(startPath: string | null) {
  const args = ["--file-selection", "--directory", `--title=${FOLDER_DIALOG_TITLE}`];
  if (!startPath) return args;
  return [...args, `--filename=${startPath.endsWith("/") ? startPath : `${startPath}/`}`];
}

export function folderPickOf(code: number | null, output: string): FolderPick {
  const path = output.replace(TRAILING_NEWLINE, "");
  if (code === 0 && path) return { kind: "picked", path };
  if (code === 0 || code === CANCELLED_EXIT_CODE) return { kind: "cancelled" };
  return { kind: "unavailable" };
}

export class ZenityFolderPicker implements FolderPicker {
  constructor(private readonly spawnPicker: SpawnPicker = spawn, private readonly environment: NodeJS.ProcessEnv = process.env) {}

  pick(startPath: string | null) {
    return new Promise<FolderPick>((resolve) => {
      const options: SpawnOptions = { shell: false, stdio: ["ignore", "pipe", "ignore"], env: terminalEnvironment(this.environment) };
      const child = this.spawnPicker(ZENITY_BINARY, folderDialogArgs(startPath), options);
      let output = "";
      const timer = setTimeout(() => (child.kill(), resolve({ kind: "cancelled" })), FOLDER_DIALOG_TIMEOUT_MS);
      timer.unref();
      child.stdout?.on("data", (chunk) => (output += String(chunk)));
      child.once("error", () => resolve({ kind: "unavailable" }));
      child.once("close", (code: number | null) => resolve(folderPickOf(code, output)));
      child.once("close", () => clearTimeout(timer));
    });
  }
}
