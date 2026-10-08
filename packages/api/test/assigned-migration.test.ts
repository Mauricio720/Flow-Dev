import { afterEach, describe, expect, it } from "vitest";
import { applyMigration, applyMigrationsAfter, testDatabase } from "./database";
import { LEGACY, seedLegacyBase, seedLegacyPlanning, seedLegacyPublished, type LegacyTask } from "./assigned-legacy-seed";
import { sourceContentHash } from "../src/application/services/assigned-issues/assignedIssueRules";
import { readPlanningProjection } from "../src/infra/database/dao/tasks/planningProjection";

const MIGRATION = "0018_assigned_issue_sources";
const T1: LegacyTask = { id: "20000000-0000-4000-8000-000000000001", operationId: "60000000-0000-4000-8000-000000000001", attemptId: "70000000-0000-4000-8000-000000000001", issueId: "4101", issueNodeId: "I_fixture_41", issueNumber: 41 };
const T2: LegacyTask = { id: "20000000-0000-4000-8000-000000000002", operationId: "60000000-0000-4000-8000-000000000002", attemptId: "70000000-0000-4000-8000-000000000002", issueId: "4202", issueNodeId: "I_fixture_41", issueNumber: 42 };
const T3: LegacyTask = { id: "20000000-0000-4000-8000-000000000003", operationId: "60000000-0000-4000-8000-000000000003", attemptId: "70000000-0000-4000-8000-000000000003", issueId: "4303", issueNodeId: null, issueNumber: 43 };
const PLAN_OPERATION = "80000000-0000-4000-8000-000000000001";
let close: (() => Promise<void>) | undefined;
afterEach(async () => { await close?.(); close = undefined; });

async function legacyDatabase() {
  const db = await testDatabase(false, MIGRATION);
  close = db.close;
  await seedLegacyBase(db.client);
  return db;
}

describe("0018 assigned issue source migration", () => {
  it("IT-005 binds an existing published task to its source without creating any claim", async () => {
    const db = await legacyDatabase();
    await seedLegacyPublished(db.client, T1);
    await seedLegacyPublished(db.client, T3);
    await applyMigration(db.client, MIGRATION);
    const sources = await db.client`select s.*, n.title, n.body_markdown, n.content_hash, n.revision from task_issue_sources s join task_issue_snapshots n on n.id = s.current_snapshot_id`;
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ task_id: T1.id, publication_attempt_id: T1.attemptId, origin: "flow_dev", issue_node_id: "I_fixture_41", issue_number: 41, revision: 1, title: "Implement CSV export" });
    expect(sources[0]!.content_hash).toBe(sourceContentHash({ repositoryId: "101", issueNodeId: "I_fixture_41", title: "Implement CSV export", bodyMarkdown: "Implement CSV export." }));
    expect(await db.client`select 1 from task_issue_claims`).toHaveLength(0);
    expect(await db.client`select 1 from tasks where origin = 'flow_dev'`).toHaveLength(2);
  });

  it("IT-006 keeps legacy operations, decisions and approvals identical and readable through the real projection", async () => {
    const db = await legacyDatabase();
    await seedLegacyPublished(db.client, T1);
    await seedLegacyPlanning(db.client, T1, PLAN_OPERATION);
    const dump = async () => JSON.stringify([await db.client`select id, task_id, kind, state, publication_attempt_id, input_hash from task_operations order by id`, await db.client`select id, publication_attempt_id, selected_route, status, approved_by_user_id, approved_at, version from task_planning_decisions`, await db.client`select id, title_snapshot, body_snapshot, issue_node_id from task_publication_attempts`]);
    const before = await dump();
    await applyMigration(db.client, MIGRATION);
    expect(await dump()).toBe(before);
    await applyMigrationsAfter(db.client, MIGRATION);
    const projection = await readPlanningProjection(db.database, T1.id);
    expect(projection.publication).toMatchObject({ attemptId: T1.attemptId });
    expect(projection.decision).toMatchObject({ status: "approved", selectedRoute: "tech_spec" });
  });

  it("IT-008 aborts on a contradictory issue identity instead of discarding history", async () => {
    const db = await legacyDatabase();
    await seedLegacyPublished(db.client, T1);
    await seedLegacyPublished(db.client, T2);
    await expect(applyMigration(db.client, MIGRATION)).rejects.toThrow(new RegExp(`binding conflict for tasks .*${T1.id}`));
    expect(await db.client`select 1 from information_schema.tables where table_name = 'task_issue_sources'`).toHaveLength(0);
    expect(await db.client`select 1 from task_publication_attempts`).toHaveLength(2);
  });

  it("rejects mutation of retained snapshots and of an assigned operator", async () => {
    const db = await legacyDatabase();
    await seedLegacyPublished(db.client, T1);
    await applyMigration(db.client, MIGRATION);
    await expect(db.client`update task_issue_snapshots set title = 'changed'`).rejects.toThrow(/immutable/);
    await expect(db.client`delete from task_issue_snapshots`).rejects.toThrow(/immutable/);
  });

  it("enforces imported-task constraints", async () => {
    const db = await legacyDatabase();
    await applyMigration(db.client, MIGRATION);
    const insert = (origin: string, author: string | null, status: string) => db.client`insert into tasks (project_id, author_user_id, origin, repository_id, repository_node_id, status) values (${LEGACY.project}, ${author}, ${origin}, '101', 'R_fixture_flow', ${status})`;
    await expect(insert("external", null, "imported")).resolves.toBeDefined();
    await expect(insert("external", LEGACY.user, "imported")).rejects.toThrow(/tasks_origin_check/);
    await expect(insert("flow_dev", null, "published")).rejects.toThrow(/tasks_origin_check/);
  });
});
