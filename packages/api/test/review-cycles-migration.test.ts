import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskArtifactVersions, taskReviewCycles, taskReviewRounds, taskTerminalSessions, tasks } from "../src/infra/database/schema";
import { applyMigration, testDatabase } from "./database";
import { closeTaskFixture } from "./task-api-support";
import { artifactWorld, sessionValues, versionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

const LEGACY_TABLES = ["task_execution_plans", "task_execution_runs", "task_execution_actions"];
type World = Awaited<ReturnType<typeof world>>;

function cycleValues({ setup }: World, overrides: Record<string, unknown> = {}) {
  return { taskId: setup.taskId, projectId: setup.project.id, hostId: "host-test", startedBy: setup.ownerId, requestKey: crypto.randomUUID(), reviewerAgent: "claude", reviewerModel: "opus", reviewerEffort: "max", executorAgent: "codex", executorModel: "gpt-5-codex", executorEffort: "high", tasksFolder: "docs/specs/test", partial: false, ...overrides } as never;
}

async function violated(operation: Promise<unknown>) {
  try {
    await operation;
    return null;
  } catch (error) {
    return (error as { cause?: { constraint_name?: string } }).cause?.constraint_name ?? "other";
  }
}

async function seedRollbackRows(context: Awaited<ReturnType<typeof artifactWorld>>) {
  const { setup, artifact, decisionId } = context;
  const [version] = await setup.database.insert(taskArtifactVersions).values(versionValues(artifact.id)).returning();
  const [review] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { purpose: "review" })).returning();
  const [execute] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { purpose: "review_execute" })).returning();
  const [cycle] = await setup.database.insert(taskReviewCycles).values(cycleValues({ setup, decisionId }, { reviewSessionId: review!.id, executeSessionId: execute!.id })).returning();
  await setup.database.update(taskTerminalSessions).set({ reviewCycleId: cycle!.id }).where(eq(taskTerminalSessions.id, review!.id));
  await setup.database.update(taskTerminalSessions).set({ reviewCycleId: cycle!.id }).where(eq(taskTerminalSessions.id, execute!.id));
  await setup.database.insert(taskReviewRounds).values({ cycleId: cycle!.id, number: 1, reviewSessionId: review!.id, executeSessionId: execute!.id, verdict: "rejected", reportPath: "reviews/review-004.md", reportVersionId: version!.id });
  return { cycleId: cycle!.id, sessionIds: [review!.id, execute!.id] };
}

describe("0053 review cycles migration", () => {
  it("V-13a preserves all task_execution columns across the migration", async () => {
    const before = await testDatabase(false, "0053_review_cycles");
    const after = await testDatabase();
    try {
      const columns = (client: typeof before.client) => client`select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name in ${client(LEGACY_TABLES)} order by table_name, ordinal_position`;
      const [previous, current] = [await columns(before.client), await columns(after.client)];
      expect(previous.length).toBeGreaterThan(0);
      expect(current).toEqual(previous);
    } finally {
      await before.close();
      await after.close();
    }
  });

  it("V-13b rolls back new purposes and tables, then reapplies the migration", async () => {
    const context = await artifactWorld();
    const { setup } = context;
    const { sessionIds } = await seedRollbackRows(context);
    await applyMigration(setup.client, "0053_review_cycles_rollback");
    const sessions = await setup.client`select purpose from task_terminal_sessions where id in ${setup.client(sessionIds)} order by purpose`;
    const rolledBack = await setup.client`select to_regclass('task_review_cycles') as cycles, to_regclass('task_review_rounds') as rounds`;
    const cycleColumn = await setup.client`select column_name from information_schema.columns where table_name = 'task_terminal_sessions' and column_name = 'review_cycle_id'`;
    expect(sessions.map((row) => row.purpose)).toEqual(["route", "route"]);
    expect({ cycles: rolledBack[0]!.cycles, rounds: rolledBack[0]!.rounds, reviewCycleId: cycleColumn.length }).toEqual({ cycles: null, rounds: null, reviewCycleId: 0 });
    await applyMigration(setup.client, "0053_review_cycles");
    const reapplied = await setup.client`select to_regclass('task_review_cycles') as cycles, to_regclass('task_review_rounds') as rounds`;
    expect(reapplied[0]).toEqual({ cycles: "task_review_cycles", rounds: "task_review_rounds" });
  });

  it("V-04i enforces cycle and round constraints, cascades tasks, and nulls deleted sessions", async () => {
    const context = await world();
    const { setup, decisionId } = context;
    const insertCycle = (overrides: Record<string, unknown> = {}) => setup.database.insert(taskReviewCycles).values(cycleValues(context, overrides)).returning();
    const [first] = await insertCycle();
    expect(await violated(insertCycle())).toBe("task_review_cycles_task_active_unique");
    await setup.database.update(taskReviewCycles).set({ state: "approved" }).where(eq(taskReviewCycles.id, first!.id));
    const [second] = await insertCycle();
    expect(second!.state).toBe("reviewing");
    expect(await violated(insertCycle({ state: "approved", requestKey: first!.requestKey }))).toBe("task_review_cycles_started_by_request_key_unique");
    expect(await violated(insertCycle({ state: "other" }))).toBe("task_review_cycles_state_check");
    expect(await violated(insertCycle({ stepRole: "other" }))).toBe("task_review_cycles_step_role_check");
    expect(await violated(insertCycle({ round: 0 }))).toBe("task_review_cycles_round_check");
    const insertRound = (number: number) => setup.database.insert(taskReviewRounds).values({ cycleId: second!.id, number });
    expect(await violated(insertRound(0))).toBe("task_review_rounds_number_check");
    expect(await violated(insertRound(1))).toBe(null);
    expect(await violated(insertRound(1))).toBe("task_review_rounds_cycle_number_unique");
    const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId)).returning();
    await setup.database.update(taskReviewCycles).set({ reviewSessionId: session!.id }).where(eq(taskReviewCycles.id, second!.id));
    await setup.database.delete(taskTerminalSessions).where(eq(taskTerminalSessions.id, session!.id));
    const [detached] = await setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, second!.id));
    expect(detached!.reviewSessionId).toBeNull();
    const disposableId = crypto.randomUUID();
    await setup.database.insert(tasks).values({ id: disposableId, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "review-migration", repositoryNodeId: "review-migration-node", status: "draft_ready", version: 1, title: "Temporária" });
    const [disposableCycle] = await setup.database.insert(taskReviewCycles).values(cycleValues(context, { taskId: disposableId })).returning();
    await setup.database.insert(taskReviewRounds).values({ cycleId: disposableCycle!.id, number: 1 });
    await setup.database.delete(tasks).where(eq(tasks.id, disposableId));
    expect(await setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, disposableCycle!.id))).toEqual([]);
    expect(await setup.database.select().from(taskReviewRounds).where(eq(taskReviewRounds.cycleId, disposableCycle!.id))).toEqual([]);
  });
});
