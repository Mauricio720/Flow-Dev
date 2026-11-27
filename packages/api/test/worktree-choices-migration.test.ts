import { afterEach, describe, expect, it } from "vitest";
import { taskWorktreeChoices } from "../src/infra/database/schema";
import { applyMigration } from "./database";
import { closeTaskFixture } from "./task-api-support";
import { world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

async function violated(operation: Promise<unknown>) {
  try {
    await operation;
    return null;
  } catch (error) {
    return (error as { cause?: { constraint_name?: string } }).cause?.constraint_name ?? "other";
  }
}

describe("0056 worktree choices migration", () => {
  it("V-W01 keeps one choice per task, accepts only the two modes and rolls back", async () => {
    const { setup } = await world();
    const base = { taskId: setup.taskId, chosenByUserId: setup.ownerId };
    expect((await setup.database.insert(taskWorktreeChoices).values({ ...base, mode: "worktree" }).returning())[0]).toMatchObject({ mode: "worktree" });
    expect(await violated(setup.database.insert(taskWorktreeChoices).values({ ...base, mode: "checkout" }))).toBe("task_worktree_choices_pkey");
    expect(await violated(setup.database.update(taskWorktreeChoices).set({ mode: "pasta" }))).toBe("task_worktree_choices_mode_check");
    await applyMigration(setup.client, "0056_worktree_choices_rollback");
    const [tables] = await setup.client`select to_regclass('task_worktree_choices') as choices`;
    expect(tables!.choices).toBeNull();
    await applyMigration(setup.client, "0056_worktree_choices");
  });
});
