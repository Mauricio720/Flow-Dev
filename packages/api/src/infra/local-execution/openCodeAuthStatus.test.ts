import { execFile as execFileCallback } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { overlaySettings } from "../spec/compozy/providerOverlayCommands";

const execFile = promisify(execFileCallback);
const directories: string[] = [];

async function status(output: string, exitCode = 0) {
  const directory = await mkdtemp(join(tmpdir(), "flow-opencode-auth-"));
  directories.push(directory);
  const executable = join(directory, "opencode");
  await writeFile(executable, '#!/bin/sh\nprintf "%s\\n" "$OPEN_CODE_AUTH_OUTPUT"\nexit "$OPEN_CODE_AUTH_EXIT"\n');
  await chmod(executable, 0o700);
  const command = overlaySettings({ providerId: "opencode", providerKind: "opencode", label: "OpenCode local", homePath: directory }).auth_status_command;
  return execFile("sh", ["-c", command], { env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, OPEN_CODE_AUTH_OUTPUT: output, OPEN_CODE_AUTH_EXIT: String(exitCode) } });
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("OpenCode status for Compozy", () => {
  it("reports a structured authenticated verdict when credentials are present", async () => {
    const result = await status("OpenCode Go api\n1 credentials");
    expect(result.stdout).toBe('{"loggedIn":true}');
  });

  it("reports a structured login requirement for an empty credential list", async () => {
    const result = await status("0 credentials");
    expect(result.stdout).toBe('{"loggedIn":false}');
  });

  it("preserves a failed CLI check as an unknown status", async () => {
    await expect(status("Unexpected error", 1)).rejects.toThrow();
  });
});
