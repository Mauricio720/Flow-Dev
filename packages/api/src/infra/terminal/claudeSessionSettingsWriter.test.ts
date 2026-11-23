import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ClaudeSessionSettingsWriter } from "./claudeSessionSettingsWriter";

const APP_URL = "https://flow.test";
const TOKEN = "token-de-teste";
const SESSION_ID = "11111111-2222-4333-8444-555555555555";
const EXPECTED_EVENTS = ["SessionStart", "UserPromptSubmit", "PostToolUse", "Stop", "Notification", "SessionEnd"];
const folders: string[] = [];

afterEach(async () => {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function sessionFolder() {
  const root = await mkdtemp(join(tmpdir(), "settings-"));
  folders.push(root);
  return { root, sessionDir: join(root, "flow-dev", "terminal-sessions", SESSION_ID) };
}

const mode = async (path: string) => (await stat(path)).mode & 0o777;

describe("ClaudeSessionSettingsWriter", () => {
  it("V-07e writes a 0600 settings file in a 0700 folder outside contexto with one http hook per event", async () => {
    const { root, sessionDir } = await sessionFolder();
    const writer = new ClaudeSessionSettingsWriter({ BETTER_AUTH_URL: `${APP_URL}/`, XDG_STATE_HOME: root });
    const file = await writer.write({ sessionDir, token: TOKEN });
    expect(file).toBe(join(sessionDir, "privado", "settings.json"));
    expect(await mode(file)).toBe(0o600);
    expect(await mode(join(sessionDir, "privado"))).toBe(0o700);
    expect(file.startsWith(join(sessionDir, "contexto"))).toBe(false);
    const settings = JSON.parse(await readFile(file, "utf8"));
    expect(Object.keys(settings.hooks)).toEqual(EXPECTED_EVENTS);
    const hook = { type: "http", url: `${APP_URL}/api/terminal-sessions/events`, headers: { Authorization: `Bearer ${TOKEN}` }, timeout: 5, onFailure: "continue" };
    for (const event of EXPECTED_EVENTS) expect(settings.hooks[event][0].hooks).toEqual([hook]);
    expect(settings.hooks.PostToolUse[0].matcher).toBe("Write|Edit|MultiEdit|NotebookEdit|Bash|Skill");
  });

  it("fails without BETTER_AUTH_URL", async () => {
    const { sessionDir } = await sessionFolder();
    await expect(new ClaudeSessionSettingsWriter({}).write({ sessionDir, token: TOKEN })).rejects.toThrow("BETTER_AUTH_URL");
  });

  it("removes the settings file and tolerates a second removal", async () => {
    const { root, sessionDir } = await sessionFolder();
    const writer = new ClaudeSessionSettingsWriter({ BETTER_AUTH_URL: APP_URL, XDG_STATE_HOME: root });
    const file = await writer.write({ sessionDir, token: TOKEN });
    await writer.remove(SESSION_ID);
    await expect(stat(file)).rejects.toThrow();
    await expect(writer.remove(SESSION_ID)).resolves.toBeUndefined();
  });
});
