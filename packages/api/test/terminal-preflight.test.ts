import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tasks } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { publishedTask, rejection, seedReview } from "./planning-support";
import { approvedWork, cleanupTerminalFolders, gitClone, linkClone } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

function scope(setup: { project: { id: string }; taskId: string }) {
  return { projectId: setup.project.id, taskId: setup.taskId };
}

describe("tasks.terminal.preflight", () => {
  it("V-03a refuses a person who is not the operator", async () => {
    const setup = await approvedWork();
    await setup.authorize(setup.readerId);
    const harness = await terminalHarness(setup);
    const outcome = await rejection(harness.callerFor(setup.readerId).terminal.preflight(scope(setup)));
    expect(outcome).toMatchObject({ code: "FORBIDDEN", reason: "operator_required" });
  });

  it("V-03b refuses a planning that is still in review", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    const harness = await terminalHarness(setup);
    expect(await rejection(harness.caller.terminal.preflight(scope(setup)))).toMatchObject({ reason: "planning_not_approved" });
  });

  it("V-03b refuses again after the planning is redone and waits for a new approval", async () => {
    const setup = await approvedWork();
    await setup.database.update(tasks).set({ planningStatus: "review" }).where(eq(tasks.id, setup.taskId));
    const harness = await terminalHarness(setup);
    expect(await rejection(harness.caller.terminal.preflight(scope(setup)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "planning_not_approved" });
  });

  it("V-03c answers without a link with checkout null and the default prompt", async () => {
    const setup = await approvedWork("Corpo da Issue");
    const harness = await terminalHarness(setup);
    const result = await harness.caller.terminal.preflight(scope(setup));
    expect(result.checkout).toBeNull();
    expect(result.maxPromptLength).toBe(20_000);
    expect(result.defaultPrompt).toContain("Issue #41 — Título");
    expect(result.defaultPrompt).toContain("Corpo da Issue");
    expect(result.defaultPrompt.startsWith("/flow-dev:spec-writer")).toBe(true);
  });

  it("V-03c reports the linked folder, its branch and whether it is dirty", async () => {
    const setup = await approvedWork();
    const clone = await gitClone();
    await linkClone(setup, clone);
    const harness = await terminalHarness(setup);
    expect((await harness.caller.terminal.preflight(scope(setup))).checkout).toMatchObject({ path: clone, detachedSha: null, dirty: false });
    await writeFile(join(clone, "novo.txt"), "x");
    expect((await harness.caller.terminal.preflight(scope(setup))).checkout).toMatchObject({ dirty: true });
  });

  it("V-03c reports the short sha for a detached HEAD", async () => {
    const setup = await approvedWork();
    const clone = await gitClone();
    execFileSync("git", ["-c", "user.email=t@t.invalid", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "x"], { cwd: clone });
    execFileSync("git", ["checkout", "-q", "--detach"], { cwd: clone });
    await linkClone(setup, clone);
    const harness = await terminalHarness(setup);
    const { checkout } = await harness.caller.terminal.preflight(scope(setup));
    expect(checkout?.branch).toBeNull();
    expect(checkout?.detachedSha).toMatch(/^[0-9a-f]{7}$/);
  });
});
