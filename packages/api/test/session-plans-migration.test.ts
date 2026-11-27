import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskArtifactVersions, taskArtifacts, taskSessionPlanItems, taskSessionPlans, taskTerminalSessions, tasks } from "../src/infra/database/schema";
import { applyMigration } from "./database";
import { closeTaskFixture } from "./task-api-support";
import { artifactWorld, sessionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

const MIGRATION = "0050_session_plans";
const ROLLBACK = `${MIGRATION}_rollback`;
const LATER_ROLLBACK = "0058_session_plan_runs_rollback";
const MAX_TASKS_PER_ITEM = 30;
const MAX_TEXT_LENGTH = 64;

type World = Awaited<ReturnType<typeof world>>;

async function violated(operation: Promise<unknown>) {
  try {
    await operation;
    return null;
  } catch (error) {
    return (error as { cause?: { constraint_name?: string } }).cause?.constraint_name ?? "other";
  }
}

async function seedPlan({ setup }: Pick<World, "setup">, itemOverrides: Record<string, unknown> = {}) {
  const [plan] = await setup.database.insert(taskSessionPlans).values({ taskId: setup.taskId, tasksFolder: "docs/specs/login", manifestVersion: 1, updatedBy: setup.ownerId }).returning();
  const item = { planId: plan!.id, position: 1, taskIds: ["task_01"], agent: "claude", model: "opus", effort: "max", ...itemOverrides };
  return { plan: plan!, item };
}

describe("0050 session plans migration", () => {
  it("V-43a keeps an existing session as route, claude and without a model after rollback and reapplication", async () => {
    const { setup, decisionId } = await world();
    await applyMigration(setup.client, LATER_ROLLBACK);
    await applyMigration(setup.client, ROLLBACK);
    const id = crypto.randomUUID();
    await setup.client`insert into task_terminal_sessions (id, task_id, project_id, user_id, planning_decision_id, route, request_key, checkout_path, dirty, status) values (${id}, ${setup.taskId}, ${setup.project.id}, ${setup.ownerId}, ${decisionId}, 'tech_spec', ${crypto.randomUUID()}, '/work/shop', false, 'running')`;
    await applyMigration(setup.client, MIGRATION);
    const [row] = await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, id));
    expect(row).toMatchObject({ status: "running", purpose: "route", agent: "claude", model: null, effort: null, planItemId: null });
  });

  it("V-43b removes the plans and the new columns on rollback and leaves the artifacts untouched", async () => {
    const { setup, artifact } = await artifactWorld();
    await setup.database.insert(taskArtifactVersions).values({ artifactId: artifact.id, version: 1, skill: "spec-writer", content: "a", sha256: "a".repeat(64), byteSize: 1, trigger: "stop" });
    const { item } = await seedPlan({ setup });
    await setup.database.insert(taskSessionPlanItems).values(item);
    await applyMigration(setup.client, LATER_ROLLBACK);
    await applyMigration(setup.client, ROLLBACK);
    const [tables] = await setup.client`select to_regclass('task_session_plans') as plans, to_regclass('task_session_plan_items') as items`;
    const columns = await setup.client`select column_name from information_schema.columns where table_name = 'task_terminal_sessions' and column_name in ('purpose','plan_item_id','agent','model','effort')`;
    expect({ plans: tables!.plans, items: tables!.items, columns: columns.length }).toEqual({ plans: null, items: null, columns: 0 });
    expect(await setup.database.select().from(taskArtifacts)).toHaveLength(1);
    expect(await setup.database.select().from(taskArtifactVersions)).toHaveLength(1);
  });

  it("V-43c rejects values outside the checks and keeps one plan per task and one item per position", async () => {
    const context = await world();
    const { setup, decisionId } = context;
    const { plan, item } = await seedPlan(context);
    const insert = (overrides: Record<string, unknown>) => setup.database.insert(taskSessionPlanItems).values({ ...item, position: 2, ...overrides });
    const manyTasks = Array.from({ length: MAX_TASKS_PER_ITEM + 1 }, (_, index) => `task_${String(index + 1).padStart(2, "0")}`);
    expect(await violated(insert({ agent: "gemini" }))).toBe("task_session_plan_items_agent_check");
    expect(await violated(insert({ taskIds: manyTasks }))).toBe("task_session_plan_items_task_ids_check");
    expect(await violated(insert({ taskIds: ["tarefa-1"] }))).toBe("task_session_plan_items_task_ids_check");
    expect(await violated(insert({ model: "m".repeat(MAX_TEXT_LENGTH + 1) }))).toBe("task_session_plan_items_model_check");
    expect(await violated(insert({ effort: "" }))).toBe("task_session_plan_items_effort_check");
    expect(await violated(setup.database.insert(taskSessionPlanItems).values(item))).toBe(null);
    expect(await violated(insert({ position: 1 }))).toBe("task_session_plan_items_plan_position_unique");
    expect(await violated(setup.database.insert(taskSessionPlans).values({ taskId: setup.taskId, tasksFolder: "x", manifestVersion: 1, updatedBy: setup.ownerId }))).toBe("task_session_plans_task_id_unique");
    expect(await violated(setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { purpose: "other" })))).toBe("task_terminal_sessions_purpose_check");
    expect(await violated(setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { purpose: "review" })))).toBe(null);
    expect(await violated(setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { agent: "gemini" })))).toBe("task_terminal_sessions_agent_check");
    expect(plan.version).toBe(1);
  });

  it("V-43c deletes the items with the task, and keeps a session with a null item when the item is deleted", async () => {
    const context = await world();
    const { setup, decisionId } = context;
    const { plan, item } = await seedPlan(context);
    const [stored] = await setup.database.insert(taskSessionPlanItems).values(item).returning();
    const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { purpose: "plan_item", planItemId: stored!.id })).returning();
    expect(session).toMatchObject({ purpose: "plan_item", planItemId: stored!.id });
    await setup.database.delete(taskSessionPlanItems).where(eq(taskSessionPlanItems.id, stored!.id));
    const [kept] = await setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, session!.id));
    expect(kept).toMatchObject({ purpose: "plan_item", planItemId: null });
    const disposableId = crypto.randomUUID();
    await setup.database.insert(tasks).values({ id: disposableId, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 1, title: "Descartável" });
    const [disposablePlan] = await setup.database.insert(taskSessionPlans).values({ taskId: disposableId, tasksFolder: "docs/specs/outra", manifestVersion: 1, updatedBy: setup.ownerId }).returning();
    await setup.database.insert(taskSessionPlanItems).values({ ...item, planId: disposablePlan!.id });
    await setup.database.delete(tasks).where(eq(tasks.id, disposableId));
    expect(await setup.database.select().from(taskSessionPlans).where(eq(taskSessionPlans.id, disposablePlan!.id))).toEqual([]);
    expect(await setup.database.select().from(taskSessionPlanItems).where(eq(taskSessionPlanItems.planId, disposablePlan!.id))).toEqual([]);
    expect(await setup.database.select().from(taskSessionPlans).where(eq(taskSessionPlans.id, plan.id))).toHaveLength(1);
  });
});
