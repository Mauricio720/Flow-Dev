import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { GnomeTerminalLauncher, type LaunchedProcess } from "./gnomeTerminalLauncher";

const COMMAND = { file: "gnome-terminal", args: ["--working-directory=/x", "--", "claude", "--", "--help"] };

function fakeProcess() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, { unref: vi.fn() }) as EventEmitter & LaunchedProcess & { unref: ReturnType<typeof vi.fn> };
}

describe("GnomeTerminalLauncher", () => {
  it("V-04a spawns detached without a shell, with the arguments untouched, and unrefs the child", async () => {
    const child = fakeProcess();
    const spawnProcess = vi.fn(() => child);
    const launching = new GnomeTerminalLauncher(spawnProcess, { PATH: "/bin", DATABASE_URL: "secret" }).launch(COMMAND);
    child.emit("exit", 0);
    await launching;
    expect(spawnProcess).toHaveBeenCalledWith("gnome-terminal", COMMAND.args, expect.objectContaining({ detached: true, shell: false, stdio: "ignore" }));
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it("passes only an allow list of environment variables, dropping server secrets and Claude session markers", async () => {
    const child = fakeProcess();
    const spawnProcess = vi.fn(() => child);
    const environment = { PATH: "/bin", DISPLAY: ":0", XDG_RUNTIME_DIR: "/run/user/1", DATABASE_URL: "secret", CLAUDECODE: "1", CLAUDE_CODE_SESSION_ID: "x", CLAUDE_CONFIG_DIR: "/cfg" };
    const launching = new GnomeTerminalLauncher(spawnProcess, environment).launch(COMMAND);
    child.emit("exit", 0);
    await launching;
    const options = (spawnProcess.mock.calls[0] as unknown as [string, string[], { env: NodeJS.ProcessEnv }])[2];
    expect(options.env).toEqual({ PATH: "/bin", DISPLAY: ":0", XDG_RUNTIME_DIR: "/run/user/1", CLAUDE_CONFIG_DIR: "/cfg" });
  });

  it("rejects when the spawn fails, such as a missing binary", async () => {
    const child = fakeProcess();
    const launching = new GnomeTerminalLauncher(() => child).launch(COMMAND);
    child.emit("error", Object.assign(new Error("spawn gnome-terminal ENOENT"), { code: "ENOENT" }));
    await expect(launching).rejects.toThrow("ENOENT");
  });

  it("rejects when the terminal client exits with an error code", async () => {
    const child = fakeProcess();
    const launching = new GnomeTerminalLauncher(() => child).launch(COMMAND);
    child.emit("exit", 1);
    await expect(launching).rejects.toThrow("código 1");
  });

  it("settles as launched when the client keeps running past the settle window", async () => {
    vi.useFakeTimers();
    const launching = new GnomeTerminalLauncher(() => fakeProcess()).launch(COMMAND);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(launching).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
