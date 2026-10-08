import { execFile } from "node:child_process";
import { promisify } from "node:util";

const PICKER_TITLE = "Escolha a pasta do projeto";
const PICKER_TIMEOUT_MS = 300_000;
const MISSING_PROGRAM_CODE = "ENOENT";
const WINDOWS_PICKER_SCRIPT = "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; if ($dialog.ShowDialog() -eq 'OK') { $dialog.SelectedPath }";

type PickerCommand = { file: string; args: string[] };
export type PickerRunner = (file: string, args: string[], options: { timeout: number }) => Promise<{ stdout: string }>;

const PICKERS: Partial<Record<NodeJS.Platform, PickerCommand[]>> = {
  linux: [
    { file: "zenity", args: ["--file-selection", "--directory", `--title=${PICKER_TITLE}`] },
    { file: "kdialog", args: ["--getexistingdirectory", ".", "--title", PICKER_TITLE] },
  ],
  darwin: [{ file: "osascript", args: ["-e", `POSIX path of (choose folder with prompt "${PICKER_TITLE}")`] }],
  win32: [{ file: "powershell", args: ["-NoProfile", "-Command", WINDOWS_PICKER_SCRIPT] }],
};

export async function pickLocalFolder(platform: NodeJS.Platform = process.platform, runner: PickerRunner = promisify(execFile)): Promise<string> {
  for (const picker of PICKERS[platform] ?? []) {
    const outcome = await openPicker(picker, runner);
    if (!outcome.launched) continue;
    if (!outcome.path) throw new Error("folder_not_selected");
    return outcome.path;
  }
  throw new Error("folder_picker_unavailable");
}

async function openPicker(picker: PickerCommand, runner: PickerRunner) {
  try {
    const result = await runner(picker.file, picker.args, { timeout: PICKER_TIMEOUT_MS });
    return { launched: true, path: result.stdout.trim() };
  } catch (error) {
    return { launched: !isMissingProgram(error), path: "" };
  }
}

function isMissingProgram(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === MISSING_PROGRAM_CODE;
}
