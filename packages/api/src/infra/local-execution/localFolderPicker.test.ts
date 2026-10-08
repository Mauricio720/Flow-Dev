import { describe, expect, it, vi } from "vitest";
import { pickLocalFolder, type PickerRunner } from "./localFolderPicker";

const missingProgram = Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" });
const cancelled = Object.assign(new Error("exit 1"), { code: 1 });

describe("pickLocalFolder", () => {
  it("returns the folder chosen in the native dialog", async () => {
    const runner = vi.fn<PickerRunner>(async () => ({ stdout: "/home/dev/orcalivre\n" }));
    await expect(pickLocalFolder("linux", runner)).resolves.toBe("/home/dev/orcalivre");
    expect(runner.mock.calls[0]?.[0]).toBe("zenity");
  });
  it("falls back to the next dialog program when the first one is not installed", async () => {
    const runner = vi.fn<PickerRunner>().mockRejectedValueOnce(missingProgram).mockResolvedValueOnce({ stdout: "/home/dev/orcalivre" });
    await expect(pickLocalFolder("linux", runner)).resolves.toBe("/home/dev/orcalivre");
    expect(runner.mock.calls[1]?.[0]).toBe("kdialog");
  });
  it("reports a cancelled dialog without trying another program", async () => {
    const runner = vi.fn<PickerRunner>().mockRejectedValue(cancelled);
    await expect(pickLocalFolder("linux", runner)).rejects.toThrow("folder_not_selected");
    expect(runner).toHaveBeenCalledOnce();
  });
  it("reports that no dialog is available when no program can be launched", async () => {
    await expect(pickLocalFolder("linux", vi.fn<PickerRunner>().mockRejectedValue(missingProgram))).rejects.toThrow("folder_picker_unavailable");
    await expect(pickLocalFolder("aix", vi.fn<PickerRunner>())).rejects.toThrow("folder_picker_unavailable");
  });
});
