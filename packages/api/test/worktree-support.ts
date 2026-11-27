import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { WorktreeMode } from "../src/application/worktrees/worktreeChoice";
import { taskWorktreeChoices } from "../src/infra/database/schema";
import type { PlanningSetup } from "./planning-support";
import { terminalHarness } from "./terminal-harness";
import { approvedWork, gitClone, linkClone, openInput } from "./terminal-support";

export const ISSUE_BRANCH = "flow/issue-41";

export function git(cwd: string, args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

export async function committedClone() {
  const root = await gitClone();
  git(root, ["config", "user.email", "flow@test.local"]);
  git(root, ["config", "user.name", "Flow Test"]);
  await mkdir(join(root, "apps", "web"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Shop\n");
  await writeFile(join(root, "apps", "web", "page.ts"), "export {};\n");
  await writeFile(join(root, ".gitignore"), ".env*\n!.env.example\n");
  await writeFile(join(root, ".env.example"), "SECRET=\n");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "init"]);
  return root;
}

export async function setChoice(setup: PlanningSetup, mode: WorktreeMode | null) {
  await setup.database.delete(taskWorktreeChoices).where(eq(taskWorktreeChoices.taskId, setup.taskId));
  if (mode) await setup.database.insert(taskWorktreeChoices).values({ taskId: setup.taskId, mode, chosenByUserId: setup.ownerId });
}

export async function worktreeWorld(mode: WorktreeMode | null = "worktree") {
  const setup = await approvedWork();
  const clone = await committedClone();
  await linkClone(setup, clone);
  await setChoice(setup, mode);
  const harness = await terminalHarness(setup);
  return { setup, clone, harness, worktree: join(dirname(clone), "shop-worktrees", "issue-41") };
}

export type WorktreeWorld = Awaited<ReturnType<typeof worktreeWorld>>;

export function openSession(world: WorktreeWorld) {
  return world.harness.caller.terminal.open(openInput(world.setup) as never);
}

export function preflightOf(world: WorktreeWorld) {
  return world.harness.caller.terminal.preflight({ projectId: world.setup.project.id, taskId: world.setup.taskId });
}

export async function refusalOf(operation: Promise<unknown>) {
  const error = await operation.then(() => null, (caught: unknown) => caught);
  if (!(error instanceof TRPCError)) throw new Error("expected a refusal");
  return error as TRPCError & { cause?: { reason: string } };
}
