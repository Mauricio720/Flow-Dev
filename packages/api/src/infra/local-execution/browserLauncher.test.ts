import { describe, expect, it, vi } from "vitest";
import { openInBrowser, type LauncherSpawner } from "./browserLauncher";

const URL_TO_OPEN = "http://localhost:3000/settings/local-machine/pairing/code";

function spawnerSpy() {
  const child = { on: vi.fn(), unref: vi.fn() };
  return { child, spawner: vi.fn<LauncherSpawner>(() => child) };
}

describe("openInBrowser", () => {
  it("hands the address to the system launcher without waiting for it", () => {
    const { child, spawner } = spawnerSpy();
    expect(openInBrowser(URL_TO_OPEN, "linux", spawner)).toBe(true);
    expect(spawner).toHaveBeenCalledWith("xdg-open", [URL_TO_OPEN]);
    expect(child.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(child.unref).toHaveBeenCalledOnce();
  });
  it("does nothing on a system without a known launcher", () => {
    const { spawner } = spawnerSpy();
    expect(openInBrowser(URL_TO_OPEN, "aix", spawner)).toBe(false);
    expect(spawner).not.toHaveBeenCalled();
  });
});
