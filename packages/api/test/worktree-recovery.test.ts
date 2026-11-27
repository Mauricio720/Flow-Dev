import { afterEach, describe, expect, it } from "vitest";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { ISSUE_BRANCH, git, openSession, preflightOf, refusalOf, worktreeWorld, type WorktreeWorld } from "./worktree-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

async function commitInWorktree(world: WorktreeWorld) {
  await writeFile(join(world.worktree, "feature.md"), "parte pronta\n");
  git(world.worktree, ["add", "feature.md"]);
  git(world.worktree, ["commit", "-q", "-m", "feature"]);
}

describe("worktree folders that changed outside Flow Dev", () => {
  it("V-W13 recreates a removed folder from the existing branch and keeps its commits", async () => {
    const world = await worktreeWorld();
    await openSession(world);
    await commitInWorktree(world);
    await rm(world.worktree, { recursive: true, force: true });
    expect(await preflightOf(world)).toMatchObject({ worktree: { state: "restore_folder", branch: ISSUE_BRANCH } });
    await openSession(world);
    await access(join(world.worktree, "feature.md"));
    expect(git(world.worktree, ["branch", "--show-current"])).toBe(ISSUE_BRANCH);
  });

  it("V-W14 creates the branch again from the configured folder when folder and branch were removed", async () => {
    const world = await worktreeWorld();
    await openSession(world);
    await commitInWorktree(world);
    await rm(world.worktree, { recursive: true, force: true });
    git(world.clone, ["worktree", "prune"]);
    git(world.clone, ["branch", "-D", ISSUE_BRANCH]);
    expect(await preflightOf(world)).toMatchObject({ worktree: { state: "restore_branch" } });
    await openSession(world);
    expect(git(world.worktree, ["rev-parse", "HEAD"])).toBe(git(world.clone, ["rev-parse", "HEAD"]));
    await expect(access(join(world.worktree, "feature.md"))).rejects.toThrow();
  });

  it("V-W15 refuses to use a folder in the worktree place that is not the worktree of the work", async () => {
    const world = await worktreeWorld();
    await mkdir(world.worktree, { recursive: true });
    await writeFile(join(world.worktree, "outro.txt"), "não é do Flow Dev\n");
    expect(await preflightOf(world)).toMatchObject({ worktree: { state: "conflict" } });
    const error = await refusalOf(openSession(world));
    expect(error).toMatchObject({ code: "PRECONDITION_FAILED", message: `A pasta ${world.worktree} já existe e não é o worktree deste trabalho. Mova ou apague essa pasta e tente de novo.` });
    expect(await world.setup.database.select().from(taskTerminalSessions)).toHaveLength(0);
  });

  it("V-W16 refuses when the branch of the work is checked out in another folder", async () => {
    const world = await worktreeWorld();
    git(world.clone, ["switch", "-q", "-c", ISSUE_BRANCH]);
    expect(await preflightOf(world)).toMatchObject({ worktree: { state: "branch_busy", busyPath: world.clone } });
    const error = await refusalOf(openSession(world));
    expect(error.cause?.reason).toBe("worktree_branch_busy");
    expect(error.message).toBe(`A branch ${ISSUE_BRANCH} está em uso em ${world.clone}. Troque a branch dessa pasta e tente de novo.`);
    await expect(access(world.worktree)).rejects.toThrow();
  });

  it("V-W17 reports an existing branch before creating the first worktree from it", async () => {
    const world = await worktreeWorld();
    git(world.clone, ["branch", ISSUE_BRANCH]);
    expect(await preflightOf(world)).toMatchObject({ worktree: { state: "from_branch" } });
    await openSession(world);
    expect(git(world.worktree, ["branch", "--show-current"])).toBe(ISSUE_BRANCH);
  });
});
