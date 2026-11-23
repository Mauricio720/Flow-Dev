import { afterEach, describe, expect, it } from "vitest";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { publishedTask, planningCaller, planningBase, reviewState, seedReview } from "./planning-support";
import { cleanupTerminalFolders, openInput, readSessionPrompt, sessionFolder } from "./terminal-support";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { terminalHarness } from "./terminal-harness";
import { fingerprint, readySetup, rowsOf } from "./terminal-open-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.terminal.open", () => {
  it("opens one session as flow_dev, copies the skills and stores the literal prompt without starting any process", async () => {
    const { setup, clone, harness } = await readySetup();
    const prompt = "Teste \"aspas\" 'simples' $(whoami) `crase`\n\n--help";
    const result = await harness.caller.terminal.open(openInput(setup, { prompt }));
    expect(result.unavailableIssueImages).toBe(0);
    const folder = sessionFolder(harness.state, result.sessionId);
    expect((await stat(join(folder, "contexto", "skills", "direct-executor", "SKILL.md"))).isFile()).toBe(true);
    expect(await readSessionPrompt(harness.state, result.sessionId)).toBe(prompt);
    await expect(stat(join(folder, "privado"))).rejects.toThrow();
    const [session] = await setup.database.select().from(taskTerminalSessions);
    expect(session).toMatchObject({ id: result.sessionId, taskId: setup.taskId, userId: setup.ownerId, route: "tech_spec", checkoutPath: clone, dirty: false, launchFailedAt: null, status: "opening", runtime: "flow_dev", permissionMode: "bypass", hostId: machineIdentity(), workerId: null, tokenHash: null });
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
  });

  it("V-03j registers the preparation failure, removes the session folder and lets the same key try again", async () => {
    const { setup, harness } = await readySetup();
    harness.context.failure = new Error("sem espaço em disco");
    const input = openInput(setup);
    await expect(harness.caller.terminal.open(input)).rejects.toThrow();
    const [failed] = await setup.database.select().from(taskTerminalSessions);
    expect(failed).toMatchObject({ launchError: "sem espaço em disco", status: "launch_failed" });
    expect(failed!.launchFailedAt).not.toBeNull();
    await expect(stat(sessionFolder(harness.state, failed!.id))).rejects.toThrow();
    harness.context.failure = null;
    expect((await harness.caller.terminal.open(input)).sessionId).toBe(failed!.id);
    const [retried] = await setup.database.select().from(taskTerminalSessions);
    expect(retried).toMatchObject({ launchFailedAt: null, launchError: null, status: "opening", runtime: "flow_dev", hostId: machineIdentity() });
    expect((await stat(join(sessionFolder(harness.state, failed!.id), "contexto"))).isDirectory()).toBe(true);
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
