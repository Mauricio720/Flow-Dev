import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskIssueClaims, taskPlanningDecisions, taskTerminalSessions, taskWorktreeChoices } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { HARNESS_NOW, terminalHarness } from "./terminal-harness";
import { sessionValues } from "./terminal-tracking-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { publishedTask, seedReview } from "./planning-support";
import { ISSUE_BRANCH, refusalOf, setChoice, worktreeWorld, type WorktreeWorld } from "./worktree-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

function choose(world: Pick<WorktreeWorld, "setup" | "harness">, mode: "worktree" | "checkout") {
  return world.harness.caller.worktree.choose({ projectId: world.setup.project.id, taskId: world.setup.taskId, mode });
}

async function moveClaimToReader(world: WorktreeWorld) {
  const [claim] = await world.setup.database.select().from(taskIssueClaims).where(eq(taskIssueClaims.taskId, world.setup.taskId));
  await world.setup.database.delete(taskIssueClaims).where(eq(taskIssueClaims.taskId, world.setup.taskId));
  await world.setup.database.insert(taskIssueClaims).values({ ...claim!, id: crypto.randomUUID(), candidateUserId: world.setup.readerId, operatorUserId: world.setup.readerId });
}

async function detailOf(world: WorktreeWorld) {
  return (await world.harness.caller.byId({ projectId: world.setup.project.id, taskId: world.setup.taskId })).worktree;
}

async function seedSession(world: WorktreeWorld, overrides: Record<string, unknown> = {}) {
  const [decision] = await world.setup.database.select().from(taskPlanningDecisions);
  await world.setup.database.insert(taskTerminalSessions).values(sessionValues(world.setup, decision!.id, overrides));
}

describe("worktree choice after the planning approval", () => {
  it("V-W02 starts without a choice and lets the operator choose and change it before the first session", async () => {
    const world = await worktreeWorld(null);
    expect(await detailOf(world)).toEqual({ mode: null, locked: false, branch: ISSUE_BRANCH, chosenAt: null });
    expect(await choose(world, "worktree")).toEqual({ mode: "worktree", locked: false, branch: ISSUE_BRANCH, chosenAt: HARNESS_NOW.toISOString() });
    expect(await choose(world, "checkout")).toMatchObject({ mode: "checkout", locked: false });
    expect(await detailOf(world)).toMatchObject({ mode: "checkout", locked: false });
    expect(await world.setup.database.select().from(taskWorktreeChoices)).toHaveLength(1);
  });

  it("V-W03 keeps the choice fixed once a session opened, ignoring sessions that failed to launch", async () => {
    const world = await worktreeWorld("worktree");
    await seedSession(world, { launchFailedAt: new Date("2026-11-23T14:00:00Z"), launchError: "Claude Code não encontrado no PATH.", status: "launch_failed" });
    expect(await choose(world, "checkout")).toMatchObject({ mode: "checkout", locked: false });
    await seedSession(world, { status: "ended" });
    const error = await refusalOf(choose(world, "worktree"));
    expect(error).toMatchObject({ code: "CONFLICT", message: "A escolha de worktree fica fixa depois que a primeira sessão do trabalho abre." });
    expect(error.cause?.reason).toBe("worktree_choice_locked");
    expect(await detailOf(world)).toMatchObject({ mode: "checkout", locked: true });
  });

  it("V-W04 treats work that already had sessions before the choice existed as without worktree", async () => {
    const world = await worktreeWorld(null);
    await seedSession(world, { status: "ended" });
    expect(await detailOf(world)).toMatchObject({ mode: "checkout", locked: true, chosenAt: null });
  });

  it("V-W05 refuses the choice from someone who is not the operator", async () => {
    const world = await worktreeWorld(null);
    await moveClaimToReader(world);
    const error = await refusalOf(choose(world, "worktree"));
    expect(error).toMatchObject({ code: "FORBIDDEN", message: "Somente a pessoa operadora desta Issue pode agir." });
    expect(await world.setup.database.select().from(taskWorktreeChoices)).toHaveLength(0);
  });

  it("V-W06 refuses the choice while the planning is not approved", async () => {
    const setup = await publishedTask();
    await seedReview(setup);
    await setChoice(setup, null);
    const error = await refusalOf(choose({ setup, harness: await terminalHarness(setup) }, "worktree"));
    expect(error.cause?.reason).toBe("planning_not_approved");
    expect(await setup.database.select().from(taskWorktreeChoices)).toHaveLength(0);
  });
});
