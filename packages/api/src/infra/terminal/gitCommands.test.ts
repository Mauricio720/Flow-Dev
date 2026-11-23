import { afterEach, expect, it, vi } from "vitest";
import { runGit } from "./gitCommands";

const { executeGit } = vi.hoisted(() => ({ executeGit: vi.fn() }));
vi.mock("node:child_process", () => ({ execFile: executeGit }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

it("does not pass Node instrumentation preloads to Git or change the parent environment", async () => {
  const preload = "/extensions/console-ninja-fs-hooks.linux-x64-gnu.node";
  vi.stubEnv("LD_PRELOAD", preload);
  executeGit.mockImplementation((_file, _args, _options, callback) => callback(null, "/work/shop\n"));
  await expect(runGit("/work/shop", ["rev-parse", "--show-toplevel"])).resolves.toEqual({ ok: true, stdout: "/work/shop\n" });
  const options = executeGit.mock.lastCall?.[2];
  expect(options.env).not.toHaveProperty("LD_PRELOAD");
  expect(options.env).toMatchObject({ PATH: process.env.PATH, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" });
  expect(process.env.LD_PRELOAD).toBe(preload);
});
