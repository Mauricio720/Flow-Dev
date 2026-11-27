import { afterEach, describe, expect, it } from "vitest";
import { access, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { taskReviewCycles, taskTerminalSessions } from "../src/infra/database/schema";
import { createTerminalLauncher } from "../src/infra/terminalComposition";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { closeTaskFixture } from "./task-api-support";
import { HARNESS_NOW } from "./terminal-harness";
import { cleanupTerminalFolders } from "./terminal-support";
import { ISSUE_BRANCH, git, openSession, preflightOf, refusalOf, worktreeWorld, type WorktreeWorld } from "./worktree-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const PRIVATE_FILE_PERMISSIONS = 0o600;
const PERMISSION_BITS = 0o777;

async function sessionOf(world: WorktreeWorld, sessionId: string) {
  const [session] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId));
  return session!;
}

describe("sessions of a work that chose a worktree", () => {
  it("V-W07 creates the branch and the folder beside the clone from its current commit and opens the session there", async () => {
    const world = await worktreeWorld();
    await writeFile(join(world.clone, "README.md"), "# Mudança não commitada\n");
    expect(await preflightOf(world)).toMatchObject({ checkout: { path: world.clone, dirty: true }, worktree: { mode: "worktree", path: world.worktree, branch: ISSUE_BRANCH, state: "create", dirty: false, busyPath: null } });
    const session = await sessionOf(world, (await openSession(world)).sessionId);
    expect(session).toMatchObject({ checkoutPath: world.worktree, branch: ISSUE_BRANCH, dirty: false });
    expect(git(world.worktree, ["rev-parse", "HEAD"])).toBe(git(world.clone, ["rev-parse", "HEAD"]));
    expect(await readFile(join(world.worktree, "README.md"), "utf8")).toBe("# Shop\n");
    expect(git(world.clone, ["branch", "--show-current"])).not.toBe(ISSUE_BRANCH);
  });

  it("V-W08 copies only the missing env files, privately, and never overwrites the worktree copy", async () => {
    const world = await worktreeWorld();
    await writeFile(join(world.clone, ".env"), "SECRET=1\n");
    await writeFile(join(world.clone, "apps", "web", ".env.local"), "WEB=1\n");
    await openSession(world);
    expect(await readFile(join(world.worktree, "apps", "web", ".env.local"), "utf8")).toBe("WEB=1\n");
    expect((await stat(join(world.worktree, ".env"))).mode & PERMISSION_BITS).toBe(PRIVATE_FILE_PERMISSIONS);
    await writeFile(join(world.worktree, ".env"), "SECRET=worktree\n");
    await openSession(world);
    expect(await readFile(join(world.worktree, ".env"), "utf8")).toBe("SECRET=worktree\n");
    expect(await readFile(join(world.worktree, ".env.example"), "utf8")).toBe("SECRET=\n");
  });

  it("V-W09 reuses the same worktree for the next sessions of the work", async () => {
    const world = await worktreeWorld();
    await openSession(world);
    await writeFile(join(world.worktree, "notes.md"), "trabalho em andamento\n");
    expect(await preflightOf(world)).toMatchObject({ worktree: { state: "ready", dirty: true, branch: ISSUE_BRANCH } });
    const second = await sessionOf(world, (await openSession(world)).sessionId);
    expect(second).toMatchObject({ checkoutPath: world.worktree, branch: ISSUE_BRANCH, dirty: true });
    await access(join(world.worktree, "notes.md"));
  });

  it("V-W10 opens review sessions in the worktree of the work", async () => {
    const world = await worktreeWorld();
    const [cycle] = await world.setup.database.insert(taskReviewCycles).values({ taskId: world.setup.taskId, projectId: world.setup.project.id, hostId: machineIdentity(), startedBy: world.setup.ownerId, requestKey: crypto.randomUUID(), reviewerAgent: "claude", reviewerModel: "sonnet", reviewerEffort: "high", executorAgent: "claude", executorModel: "opus", executorEffort: "max", tasksFolder: "docs/specs/login", partial: false }).returning();
    const launcher = createTerminalLauncher(world.setup.database, { env: world.harness.env, context: world.harness.context, hostId: machineIdentity(), now: () => HARNESS_NOW, tools: { has: async () => true } });
    const launched = await launcher.launch({ actorId: world.setup.ownerId, taskId: world.setup.taskId, projectId: world.setup.project.id, requestKey: crypto.randomUUID(), purpose: "review", reviewCycleId: cycle!.id, choice: { agent: "claude", model: "sonnet", effort: "high" }, prompt: "Revise a feature." });
    expect(launched.session).toMatchObject({ checkoutPath: world.worktree, branch: ISSUE_BRANCH, purpose: "review" });
  });

  it("V-W11 refuses every session while the operator has not chosen, without creating folders", async () => {
    const world = await worktreeWorld(null);
    expect((await preflightOf(world)).worktree).toEqual({ mode: null });
    const error = await refusalOf(openSession(world));
    expect(error).toMatchObject({ code: "PRECONDITION_FAILED", message: "Escolha onde trabalhar, com ou sem worktree, antes de iniciar a primeira sessão deste trabalho." });
    expect(error.cause?.reason).toBe("worktree_choice_required");
    expect(await world.setup.database.select().from(taskTerminalSessions)).toHaveLength(0);
    await expect(access(world.worktree)).rejects.toThrow();
  });

  it("V-W12 keeps sessions in the configured folder when the work chose no worktree", async () => {
    const world = await worktreeWorld("checkout");
    expect((await preflightOf(world)).worktree).toEqual({ mode: "checkout" });
    expect(await sessionOf(world, (await openSession(world)).sessionId)).toMatchObject({ checkoutPath: world.clone });
    await expect(access(world.worktree)).rejects.toThrow();
  });
});
