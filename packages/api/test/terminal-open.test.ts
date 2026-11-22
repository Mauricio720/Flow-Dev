import { afterEach, describe, expect, it } from "vitest";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { publishedTask, planningCaller, planningBase, reviewState, seedReview } from "./planning-support";
import { cleanupTerminalFolders, openInput } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";
import { fingerprint, readySetup, rowsOf } from "./terminal-open-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.terminal.open", () => {
  it("opens one session, copies the skills and hands the launcher the spike command with the literal prompt", async () => {
    const { setup, clone, harness } = await readySetup();
    const prompt = "Teste \"aspas\" 'simples' $(whoami) `crase`\n\n--help";
    const result = await harness.caller.terminal.open(openInput(setup, { prompt }));
    expect(result.unavailableIssueImages).toBe(0);
    const [command] = harness.launcher.commands;
    const contextDir = join(harness.state, "flow-dev", "terminal-sessions", result.sessionId, "contexto");
    expect(command!.file).toBe("gnome-terminal");
    expect(command!.args).toEqual([`--working-directory=${clone}`, "--", "claude", "--dangerously-skip-permissions", "--plugin-dir", contextDir, "--", prompt]);
    expect((await stat(join(contextDir, "skills", "direct-executor", "SKILL.md"))).isFile()).toBe(true);
    const [session] = await setup.database.select().from(taskTerminalSessions);
    expect(session).toMatchObject({ id: result.sessionId, taskId: setup.taskId, userId: setup.ownerId, route: "tech_spec", checkoutPath: clone, dirty: false, launchFailedAt: null });
    expect(session!.lastSignalAt).toEqual(session!.openedAt);
  });

  it("V-03i returns the same session for the same request key, sequentially and concurrently", async () => {
    const { setup, harness } = await readySetup();
    const input = openInput(setup);
    const first = await harness.caller.terminal.open(input);
    expect((await harness.caller.terminal.open(input)).sessionId).toBe(first.sessionId);
    const concurrent = openInput(setup);
    const results = await Promise.all([harness.caller.terminal.open(concurrent), harness.caller.terminal.open(concurrent), harness.caller.terminal.open(concurrent)]);
    expect(new Set(results.map((result) => result.sessionId)).size).toBe(1);
    expect(await setup.database.select().from(taskTerminalSessions)).toHaveLength(2);
    expect(harness.launcher.commands).toHaveLength(2);
  });

  it("V-03j registers the launch failure, removes the session folder and lets the same key try again", async () => {
    const { setup, harness } = await readySetup();
    harness.launcher.failure = new Error("sem display");
    const input = openInput(setup);
    const error = await harness.caller.terminal.open(input).then(() => null, (caught: unknown) => caught as Error & { cause?: { reason: string } });
    expect(error?.cause?.reason).toBe("terminal_unavailable");
    const [failed] = await setup.database.select().from(taskTerminalSessions);
    expect(failed).toMatchObject({ launchError: "sem display" });
    expect(failed!.launchFailedAt).not.toBeNull();
    await expect(stat(join(harness.state, "flow-dev", "terminal-sessions", failed!.id))).rejects.toThrow();
    harness.launcher.failure = null;
    expect((await harness.caller.terminal.open(input)).sessionId).toBe(failed!.id);
    const [retried] = await setup.database.select().from(taskTerminalSessions);
    expect(retried).toMatchObject({ launchFailedAt: null, launchError: null });
    expect(harness.launcher.commands).toHaveLength(1);
  });

  it("shows the opening in tasks.byId only after a session opens", async () => {
    const { setup, harness } = await readySetup();
    const read = () => harness.caller.byId({ projectId: setup.project.id, taskId: setup.taskId });
    expect((await read()).terminal).toEqual({ lastOpened: null });
    await harness.caller.terminal.open(openInput(setup));
    const { lastOpened } = (await read()).terminal;
    expect(lastOpened).toMatchObject({ userName: "Member" });
    expect(Number.isNaN(Date.parse(lastOpened!.openedAt))).toBe(false);
  });

  it("V-11c approving the planning opens nothing", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const harness = await terminalHarness(setup);
    const { version, decision } = await reviewState(setup);
    await planningCaller(setup).planning.approve({ ...planningBase(setup, version), decisionId: decision.id, expectedDecisionVersion: decision.version, reviewedRoute: decision.selectedRoute });
    expect(await setup.database.select().from(taskTerminalSessions)).toHaveLength(0);
    expect(harness.launcher.commands).toHaveLength(0);
  });

  it("V-11d and V-11f leave status, claim and board untouched and write nothing to GitHub", async () => {
    const { setup, harness } = await readySetup();
    const before = await rowsOf(setup);
    await harness.caller.terminal.open(openInput(setup));
    expect(await rowsOf(setup)).toBe(before);
    expect(harness.githubWrites).toEqual([]);
  });

  it("V-04f leaves the personal .claude folder and the clone untouched", async () => {
    const { setup, clone, harness } = await readySetup();
    await mkdir(join(harness.home, ".claude"), { recursive: true });
    await writeFile(join(harness.home, ".claude", "settings.json"), "{}");
    const before = [await fingerprint(join(harness.home, ".claude")), await fingerprint(clone)];
    await harness.caller.terminal.open(openInput(setup));
    expect([await fingerprint(join(harness.home, ".claude")), await fingerprint(clone)]).toEqual(before);
  });
});
