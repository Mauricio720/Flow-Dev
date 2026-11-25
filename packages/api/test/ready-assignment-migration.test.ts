import { afterEach, describe, expect, it } from "vitest";
import { applyMigration } from "./database";
import { publicationCase } from "./task-publication-case";

let close: (() => Promise<void>) | undefined;
afterEach(async () => { await close?.(); close = undefined; });

async function constraint(client: Awaited<ReturnType<typeof publicationCase>>["state"]["client"], query: Promise<unknown>) {
  try { await query; return null; } catch (error) { const value = error as { constraint_name?: string; cause?: { constraint_name?: string } }; return value.constraint_name ?? value.cause?.constraint_name ?? "other"; }
}

describe("0054 ready assignment migration", () => {
  it("adds defaulted columns to existing attempts, rolls back cleanly, and enforces both checks", async () => {
    const state = await publicationCase();
    close = state.close;
    const preview = await state.caller().preview({ projectId: state.project.id, taskId: state.taskId, revisionId: state.revisionId });
    await state.caller().publish({ projectId: state.project.id, taskId: state.taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId: state.revisionId, repositoryId: "202", previewHash: preview.previewHash });
    await applyMigration(state.state.client, "0054_ready_assignment_rollback");
    const absent = await state.state.client`select column_name from information_schema.columns where table_name = 'task_publication_attempts' and column_name in ('assign_to_self','ready_assignment')`;
    expect(absent).toHaveLength(0);
    await applyMigration(state.state.client, "0054_ready_assignment");
    const [row] = await state.state.client`select assign_to_self, ready_assignment from task_publication_attempts`;
    expect(row).toEqual({ assign_to_self: false, ready_assignment: null });
    expect(await constraint(state.state.client, state.state.client`update task_publication_attempts set ready_assignment = 'other'`)).toBe("task_publication_attempts_ready_assignment_check");
    expect(await constraint(state.state.client, state.state.client`update task_publication_attempts set ready_assignment = 'ready'`)).toBe("task_publication_attempts_ready_assignment_choice_check");
  });
});
