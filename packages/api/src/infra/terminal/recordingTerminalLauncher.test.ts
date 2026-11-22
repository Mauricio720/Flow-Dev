import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GnomeTerminalLauncher } from "./gnomeTerminalLauncher";
import { PathToolLocator } from "./pathToolLocator";
import { RecordingTerminalLauncher } from "./recordingTerminalLauncher";
import { terminalPorts } from "./terminalPorts";

const folders: string[] = [];
afterEach(async () => {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function recordFile() {
  const folder = await mkdtemp(join(tmpdir(), "recording-"));
  folders.push(folder);
  return join(folder, "launch.json");
}

describe("RecordingTerminalLauncher", () => {
  it("writes the command file and arguments as JSON, keeping the prompt literal", async () => {
    const path = await recordFile();
    const args = ["--working-directory=/x", "--", "claude", "--", "Teste \"aspas\" $(whoami)\n--help"];
    await new RecordingTerminalLauncher(path).launch({ file: "gnome-terminal", args });
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ file: "gnome-terminal", args });
  });
});

describe("terminalPorts", () => {
  it("uses the recording launcher and pretends the tools exist when the fake file is set outside production", async () => {
    const ports = terminalPorts({ FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE: "/tmp/x.json", NODE_ENV: "test", PATH: "" });
    expect(ports.launcher).toBeInstanceOf(RecordingTerminalLauncher);
    expect(await ports.tools.has("claude")).toBe(true);
  });

  it("never uses the fake launcher with NODE_ENV=production", () => {
    const ports = terminalPorts({ FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE: "/tmp/x.json", NODE_ENV: "production" });
    expect(ports.launcher).toBeInstanceOf(GnomeTerminalLauncher);
    expect(ports.tools).toBeInstanceOf(PathToolLocator);
  });

  it("uses the real launcher and the PATH when no fake file is set", () => {
    expect(terminalPorts({ PATH: "/bin" }).launcher).toBeInstanceOf(GnomeTerminalLauncher);
  });
});
