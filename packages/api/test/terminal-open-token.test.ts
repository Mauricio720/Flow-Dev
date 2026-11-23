import { afterEach, describe, expect, it } from "vitest";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders, openInput, sessionFolder } from "./terminal-support";
import { readySetup } from "./terminal-open-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.terminal.open without a session token", () => {
  it("DEC-18 stores no token hash and writes no private settings for a Flow Dev session", async () => {
    const { setup, harness } = await readySetup();
    const result = await harness.caller.terminal.open(openInput(setup));
    const [session] = await setup.database.select().from(taskTerminalSessions);
    expect(session!.tokenHash).toBeNull();
    await expect(stat(join(sessionFolder(harness.state, result.sessionId), "privado"))).rejects.toThrow();
  });

  it("does not need BETTER_AUTH_URL to open a Flow Dev session", async () => {
    const { setup, harness } = await readySetup({ env: { BETTER_AUTH_URL: "" } });
    await harness.caller.terminal.open(openInput(setup));
    const [session] = await setup.database.select().from(taskTerminalSessions);
    expect(session).toMatchObject({ status: "opening", runtime: "flow_dev" });
  });
});
