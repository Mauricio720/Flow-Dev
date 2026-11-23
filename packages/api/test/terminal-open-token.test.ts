import { afterEach, describe, expect, it } from "vitest";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { hashSessionToken } from "../src/application/services/terminal/sessionToken";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders, openInput } from "./terminal-support";
import { HARNESS_APP_URL } from "./terminal-harness";
import { readySetup } from "./terminal-open-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.terminal.open session token", () => {
  it("V-07e stores only the token hash and keeps the token in the private settings file", async () => {
    const { setup, harness } = await readySetup();
    const result = await harness.caller.terminal.open(openInput(setup));
    const settingsPath = join(harness.state, "flow-dev", "terminal-sessions", result.sessionId, "privado", "settings.json");
    expect(((await stat(settingsPath)).mode & 0o777)).toBe(0o600);
    const settings = JSON.parse(await readFile(settingsPath, "utf8"));
    const hook = settings.hooks.Stop[0].hooks[0];
    expect(hook.url).toBe(`${HARNESS_APP_URL}/api/terminal-sessions/events`);
    const token = hook.headers.Authorization.replace("Bearer ", "");
    const [session] = await setup.database.select().from(taskTerminalSessions);
    expect(session!.tokenHash).toBe(hashSessionToken(token));
    expect(JSON.stringify(session)).not.toContain(token);
  });

  it("fails the launch when BETTER_AUTH_URL is missing", async () => {
    const { setup, harness } = await readySetup({ env: { BETTER_AUTH_URL: "" } });
    await expect(harness.caller.terminal.open(openInput(setup))).rejects.toThrow();
    const [session] = await setup.database.select().from(taskTerminalSessions);
    expect(session).toMatchObject({ status: "launch_failed" });
  });
});
