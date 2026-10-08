import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { taskSpecApprovals } from "../src/infra/database/schema";
import { DrizzleLegacyFlowReader } from "../src/infra/database/dao/tasks/drizzleLegacyFlowReader";
import { DrizzleTaskFlowDao } from "../src/infra/database/dao/tasks/drizzleTaskFlowDao";
import { LegacyProjection } from "../src/application/services/task-flow/legacyProjection";
import type { PlannedAction } from "../src/application/database/dao/taskFlowDao";
import { dumpTables, fixtureConnection, runMigrationFile } from "./task-flow-support";
import { specTask } from "./spec-support";
import { seedReviewPackage, startWorkflow } from "./spec-seed";
import { closeTaskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

const LEGACY_TABLES = ["task_spec_workflows", "task_spec_stages", "task_spec_attempts", "task_spec_packages", "task_spec_documents", "task_spec_approvals", "task_spec_workspaces", "task_spec_commands"];
const SKILL_ACTION = (connectionId: string): PlannedAction => ({ position: 1, kind: "create_spec", loopName: null, loopVersion: null, inputs: {}, workspace: { kind: "isolated" }, bindings: [{ role: "main", connectionId, providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: "high" }] });

const dumpLegacy = (setup: Awaited<ReturnType<typeof specTask>>) => dumpTables(setup.database, LEGACY_TABLES);

describe("unified flow persistence", () => {
  it("UT-018 and IT-104 read an approved legacy workflow unchanged and refuse implicit conversion", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    const created = await seedReviewPackage(setup, started);
    await setup.database.insert(taskSpecApprovals).values({ workflowId: started.workflowId, stage: "prd", packageId: created.id, manifestHash: created.manifestHash, installedManifestHash: created.manifestHash, approverUserId: setup.ownerId });
    await setup.database.execute(sql`UPDATE task_spec_stages SET approved_package_id=${created.id}, state='approved' WHERE workflow_id=${started.workflowId} AND stage='prd'`);
    const dao = new DrizzleTaskFlowDao(setup.database);
    const view = await new LegacyProjection(new DrizzleLegacyFlowReader(setup.database)).read(setup.taskId);
    expect(view?.stages.find((stage) => stage.stage === "prd")).toMatchObject({ label: "PRD", approvedPackageId: created.id, state: "approved" });
    expect(await dao.flowKind(setup.taskId)).toBe("legacy");
    expect(await dao.plans.find(setup.taskId)).toBeNull();
    await expect(dao.plans.insert({ taskId: setup.taskId, actorId: setup.ownerId, revision: 1 })).rejects.toThrow();
    expect(await dao.flowKind(setup.taskId)).toBe("legacy");
  });

  it("keeps legacy rows byte-identical across an additive migration rollback and reapply", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    await seedReviewPackage(setup, started);
    const before = await dumpLegacy(setup);
    expect(before).toContain(started.workflowId);
    await runMigrationFile(setup.database, "0030_local_loop_catalog_rollback");
    await runMigrationFile(setup.database, "0029_local_link_requests_rollback");
    await runMigrationFile(setup.database, "0028_ordinary_ego_rollback");
    await runMigrationFile(setup.database, "0027_local_credential_rotation_rollback");
    await runMigrationFile(setup.database, "0026_local_checkout_lock_rollback");
    await runMigrationFile(setup.database, "0021_local_companion_rollback");
    await runMigrationFile(setup.database, "0016_unified_spec_packages_rollback");
    await runMigrationFile(setup.database, "0015_task_execution_flow_rollback");
    expect(await dumpLegacy(setup)).toBe(before);
    await runMigrationFile(setup.database, "0015_task_execution_flow");
    await runMigrationFile(setup.database, "0016_unified_spec_packages");
    await runMigrationFile(setup.database, "0021_local_companion");
    await runMigrationFile(setup.database, "0026_brainy_sheva_callister");
    await runMigrationFile(setup.database, "0027_harsh_randall_flagg");
    await runMigrationFile(setup.database, "0028_ordinary_ego");
    await runMigrationFile(setup.database, "0029_local_link_requests");
    await runMigrationFile(setup.database, "0030_local_loop_catalog");
    expect(await dumpLegacy(setup)).toBe(before);
  });

  it("models plans, ordered actions, bindings and one active write run with immutable snapshots", async () => {
    const setup = await specTask(); 
    const connectionId = await fixtureConnection(setup.database);
    const dao = new DrizzleTaskFlowDao(setup.database);
    const plan = await dao.plans.insert({ taskId: setup.taskId, actorId: setup.ownerId, revision: 1 });
    const saved = await dao.plans.replacePlanned({ planId: plan.id, revision: 1, actions: [SKILL_ACTION(connectionId)] });
    expect(saved.actions[0]).toMatchObject({ position: 1, kind: "create_spec", workspace: { kind: "isolated" }, bindings: [{ role: "main", reasoningEffort: "high" }] });
    expect(await dao.flowKind(setup.taskId)).toBe("unified");
    const action = saved.actions[0]!;
    const run = await dao.runs.insert({ actionId: action.id, taskId: setup.taskId, snapshot: { modelId: "gpt-5.6-sol" }, worktreeId: null, connectionIds: [connectionId], isWrite: true, idempotencyKey: crypto.randomUUID(), requestedBy: setup.ownerId });
    expect(run).toMatchObject({ attemptNumber: 1, state: "queued" });
    await expect(dao.runs.insert({ actionId: action.id, taskId: setup.taskId, snapshot: {}, worktreeId: null, connectionIds: [], isWrite: true, idempotencyKey: crypto.randomUUID(), requestedBy: setup.ownerId })).rejects.toThrow();
    expect((await dao.runs.activeWrite(setup.taskId))?.id).toBe(run.id);
    expect(await dao.runs.countActiveForConnection(connectionId)).toBe(1);
    await expect(setup.database.execute(sql`UPDATE task_execution_runs SET snapshot='{"modelId":"other"}'::jsonb WHERE id=${run.id}`)).rejects.toThrow();
    await setup.database.execute(sql`UPDATE task_execution_runs SET state='failed', terminal_code='runtime_failed' WHERE id=${run.id}`);
    expect(await dao.runs.countActiveForConnection(connectionId)).toBe(0);
    const next = await dao.runs.insert({ actionId: action.id, taskId: setup.taskId, snapshot: {}, worktreeId: null, connectionIds: [], isWrite: true, idempotencyKey: crypto.randomUUID(), requestedBy: setup.ownerId });
    expect(next.attemptNumber).toBe(2);
  });

  it("preserves run identity when the connection is renamed and rejects invalid action shapes", async () => {
    const setup = await specTask();
    const connectionId = await fixtureConnection(setup.database);
    const dao = new DrizzleTaskFlowDao(setup.database);
    const plan = await dao.plans.insert({ taskId: setup.taskId, actorId: setup.ownerId, revision: 1 });
    await expect(dao.plans.replacePlanned({ planId: plan.id, revision: 1, actions: [{ ...SKILL_ACTION(connectionId), kind: "loop" }] })).rejects.toThrow();
    const saved = await dao.plans.replacePlanned({ planId: plan.id, revision: 1, actions: [SKILL_ACTION(connectionId)] });
    await setup.database.execute(sql`UPDATE software_connections SET label='Renomeada', auth_state='disconnected' WHERE id=${connectionId}`);
    expect((await dao.plans.find(setup.taskId))?.actions[0]?.bindings[0]?.connectionId).toBe(saved.actions[0]!.bindings[0]!.connectionId);
    const replaced = await dao.plans.replacePlanned({ planId: plan.id, revision: 2, actions: [{ ...SKILL_ACTION(connectionId), position: 1, workspace: { kind: "existing", worktreeId: "wt-1" } }] });
    expect(replaced.actions).toHaveLength(1);
    expect(replaced.actions[0]?.workspace).toEqual({ kind: "existing", worktreeId: "wt-1" });
  });
});
