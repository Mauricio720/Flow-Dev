import { afterEach, describe, expect, it } from "vitest";
import { taskArtifactVersions, taskArtifacts, taskTerminalEvents, taskTerminalSessions, tasks } from "../src/infra/database/schema";
import { applyMigration } from "./database";
import { closeTaskFixture } from "./task-api-support";
import { artifactWorld, sessionValues, versionValues, world } from "./terminal-tracking-support";
import { eq } from "drizzle-orm";

afterEach(closeTaskFixture);

const MIGRATION = "0047_terminal_tracking_artifacts";
const ROLLBACK = `${MIGRATION}_rollback`;
const REVIEW_CYCLE_ROLLBACK = "0053_review_cycles_rollback";
const MAX_BYTES = 1_048_576;

describe("0047 terminal tracking migration", () => {
  it("MIG-a keeps existing sessions opening and moves the failed launches to launch_failed", async () => {
    const { setup, decisionId } = await world();
    await applyMigration(setup.client, REVIEW_CYCLE_ROLLBACK);
    await applyMigration(setup.client, ROLLBACK);
    const normal = crypto.randomUUID();
    const failed = crypto.randomUUID();
    const insert = (id: string, failedAt: string | null) => setup.client`insert into task_terminal_sessions (id, task_id, project_id, user_id, planning_decision_id, route, request_key, checkout_path, dirty, launch_failed_at) values (${id}, ${setup.taskId}, ${setup.project.id}, ${setup.ownerId}, ${decisionId}, 'tech_spec', ${crypto.randomUUID()}, '/work/shop', false, ${failedAt})`;
    await insert(normal, null);
    await insert(failed, new Date().toISOString());
    await applyMigration(setup.client, MIGRATION);
    await applyMigration(setup.client, "0053_review_cycles");
    const rows = await setup.database.select().from(taskTerminalSessions);
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(normal)).toMatchObject({ status: "opening", droppedEvents: 0, tokenHash: null });
    expect(byId.get(failed)).toMatchObject({ status: "launch_failed", droppedEvents: 0, tokenHash: null });
  });

  it("MIG-b rejects a status, kind, trigger, summary or size outside the checks", async () => {
    const { setup, session, artifact } = await artifactWorld();
    await expect(setup.database.update(taskTerminalSessions).set({ status: "paused" })).rejects.toThrow();
    const event = { sessionId: session.id, kind: "started", summary: "ok" };
    await expect(setup.database.insert(taskTerminalEvents).values({ ...event, kind: "output" })).rejects.toThrow();
    await expect(setup.database.insert(taskTerminalEvents).values({ ...event, summary: "x".repeat(501) })).rejects.toThrow();
    await setup.database.insert(taskTerminalEvents).values({ ...event, summary: "x".repeat(500) });
    await expect(setup.database.insert(taskArtifactVersions).values(versionValues(artifact.id, { trigger: "manual" }))).rejects.toThrow();
    await expect(setup.database.insert(taskArtifactVersions).values(versionValues(artifact.id, { byteSize: MAX_BYTES + 1 }))).rejects.toThrow();
    await expect(setup.database.insert(taskArtifactVersions).values(versionValues(artifact.id, { version: 0 }))).rejects.toThrow();
    await setup.database.insert(taskArtifactVersions).values(versionValues(artifact.id, { byteSize: MAX_BYTES }));
  });

  it("MIG-c rejects a repeated artifact path, artifact version or session token", async () => {
    const { setup, decisionId, artifact } = await artifactWorld();
    await expect(setup.database.insert(taskArtifacts).values({ taskId: setup.taskId, projectId: setup.project.id, relativePath: "docs/spec.md" })).rejects.toThrow();
    await setup.database.insert(taskArtifactVersions).values(versionValues(artifact.id));
    await expect(setup.database.insert(taskArtifactVersions).values(versionValues(artifact.id))).rejects.toThrow();
    await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { tokenHash: "h".repeat(64) }));
    await expect(setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { tokenHash: "h".repeat(64) }))).rejects.toThrow();
  });

  it("MIG-d cascades events, artifacts and versions and nulls the version session", async () => {
    const { setup, session, artifact } = await artifactWorld();
    await setup.database.insert(taskTerminalEvents).values({ sessionId: session.id, kind: "started", summary: "ok" });
    await setup.database.insert(taskArtifactVersions).values(versionValues(artifact.id, { sessionId: session.id }));
    await setup.database.delete(taskTerminalSessions).where(eq(taskTerminalSessions.id, session.id));
    expect(await setup.database.select().from(taskTerminalEvents)).toHaveLength(0);
    const [version] = await setup.database.select().from(taskArtifactVersions);
    expect(version!.sessionId).toBeNull();
    await setup.database.delete(taskArtifacts).where(eq(taskArtifacts.id, artifact.id));
    expect(await setup.database.select().from(taskArtifactVersions)).toHaveLength(0);
  });

  it("MIG-d cascades the artifacts of a deleted task", async () => {
    const { setup } = await world();
    const otherTaskId = crypto.randomUUID();
    await setup.database.insert(tasks).values({ id: otherTaskId, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 1, title: "Outra" });
    await setup.database.insert(taskArtifacts).values({ taskId: otherTaskId, projectId: setup.project.id, relativePath: "docs/other.md" });
    await setup.database.delete(tasks).where(eq(tasks.id, otherTaskId));
    expect(await setup.database.select().from(taskArtifacts).where(eq(taskArtifacts.taskId, otherTaskId))).toHaveLength(0);
  });

  it("MIG-e removes the new tables and columns on rollback and applies again", async () => {
    const { setup } = await world();
    await applyMigration(setup.client, REVIEW_CYCLE_ROLLBACK);
    await applyMigration(setup.client, ROLLBACK);
    const tables = await setup.client`select table_name from information_schema.tables where table_name in ('task_terminal_events','task_artifacts','task_artifact_versions')`;
    expect(tables).toHaveLength(0);
    const columns = await setup.client`select column_name from information_schema.columns where table_name = 'task_terminal_sessions' and column_name in ('status','token_hash','claude_session_id','end_reason','active_skill','dropped_events','started_at','ended_at','last_capture_at')`;
    expect(columns).toHaveLength(0);
    await applyMigration(setup.client, MIGRATION);
    await applyMigration(setup.client, "0053_review_cycles");
    const restored = await setup.client`select table_name from information_schema.tables where table_name in ('task_terminal_events','task_artifacts','task_artifact_versions')`;
    expect(restored).toHaveLength(3);
  });
});
