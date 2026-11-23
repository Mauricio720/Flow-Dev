import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FOLDER_DIALOG_TIMEOUT_MS, ZenityFolderPicker, folderDialogArgs, type PickerProcess } from "./zenityFolderPicker";

function fakeDialog() {
  const stdout = new PassThrough();
  return Object.assign(new EventEmitter(), { stdout, kill: vi.fn() }) as unknown as PickerProcess & EventEmitter & { stdout: PassThrough; kill: ReturnType<typeof vi.fn> };
}

function pickerWith(dialog: ReturnType<typeof fakeDialog>, environment: NodeJS.ProcessEnv = { PATH: "/bin" }) {
  const spawnPicker = vi.fn(() => dialog);
  return { picker: new ZenityFolderPicker(spawnPicker, environment), spawnPicker };
}

afterEach(() => vi.useRealTimers());

describe("ZenityFolderPicker", () => {
  it("returns the chosen folder without the trailing newline", async () => {
    const dialog = fakeDialog();
    const picking = pickerWith(dialog).picker.pick(null);
    dialog.stdout.write("/home/ana/Área de trabalho/shop\n");
    dialog.emit("close", 0);
    await expect(picking).resolves.toEqual({ kind: "picked", path: "/home/ana/Área de trabalho/shop" });
  });

  it("treats exit code 1 as the user closing the dialog", async () => {
    const dialog = fakeDialog();
    const picking = pickerWith(dialog).picker.pick(null);
    dialog.emit("close", 1);
    await expect(picking).resolves.toEqual({ kind: "cancelled" });
  });

  it("reports unavailable when zenity is missing or has no display", async () => {
    const missing = fakeDialog();
    const missingPick = pickerWith(missing).picker.pick(null);
    missing.emit("error", Object.assign(new Error("spawn zenity ENOENT"), { code: "ENOENT" }));
    const noDisplay = fakeDialog();
    const noDisplayPick = pickerWith(noDisplay).picker.pick(null);
    noDisplay.emit("close", 255);
    await expect(missingPick).resolves.toEqual({ kind: "unavailable" });
    await expect(noDisplayPick).resolves.toEqual({ kind: "unavailable" });
  });

  it("opens a directory dialog without a shell, starting at the saved folder, with only allowed variables", async () => {
    const dialog = fakeDialog();
    const { picker, spawnPicker } = pickerWith(dialog, { PATH: "/bin", DISPLAY: ":0", DATABASE_URL: "secret" });
    const picking = picker.pick("/home/ana/shop");
    dialog.emit("close", 1);
    await picking;
    const [file, args, options] = spawnPicker.mock.calls[0] as unknown as [string, string[], { shell: boolean; env: NodeJS.ProcessEnv }];
    expect(file).toBe("zenity");
    expect(args).toEqual(["--file-selection", "--directory", "--title=Escolha a pasta do clone", "--filename=/home/ana/shop/"]);
    expect(options.shell).toBe(false);
    expect(options.env).toEqual({ PATH: "/bin", DISPLAY: ":0" });
  });

  it("omits the start folder when nothing is linked yet", () => {
    expect(folderDialogArgs(null)).not.toContainEqual(expect.stringMatching(/^--filename=/));
  });

  it("closes a forgotten dialog after the timeout and reports it as cancelled", async () => {
    vi.useFakeTimers();
    const dialog = fakeDialog();
    const picking = pickerWith(dialog).picker.pick(null);
    vi.advanceTimersByTime(FOLDER_DIALOG_TIMEOUT_MS);
    await expect(picking).resolves.toEqual({ kind: "cancelled" });
    expect(dialog.kill).toHaveBeenCalledOnce();
  });
});
