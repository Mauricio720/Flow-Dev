import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskPlanningDecisions, taskSpecApprovals, taskSpecAttempts, taskSpecDocuments, taskSpecWorkflows, tasks } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { specTask } from "./spec-support";
import { seedReviewPackage, sha256, startWorkflow } from "./spec-seed";

afterEach(closeTaskFixture);
const sqlText = (error: unknown) => String((error as { cause?: { message?: string } }).cause?.message ?? error);

describe("spec persistence with PostgreSQL", () => {
  it("IT-197 rejects a second nonterminal attempt for the workflow", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    const insert = setup.database.insert(taskSpecAttempts).values({ workflowId: started.workflowId, stage: "prd", attemptNumber: 2, kind: "retry", sourceAttemptId: started.attemptId, input: {}, inputHash: "a".repeat(64) });
    await expect(insert).rejects.toThrow();
    await setup.database.update(taskSpecAttempts).set({ state: "failed" }).where(eq(taskSpecAttempts.id, started.attemptId));
    await setup.database.insert(taskSpecAttempts).values({ workflowId: started.workflowId, stage: "prd", attemptNumber: 2, kind: "retry", sourceAttemptId: started.attemptId, input: {}, inputHash: "a".repeat(64) });
  });

  it("IT-198 makes approvals immutable and requires the exact installed package", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    const created = await seedReviewPackage(setup, started);
    const base = { workflowId: started.workflowId, stage: "prd", packageId: created.id, approverUserId: setup.ownerId, installedManifestHash: created.manifestHash };
    await expect(setup.database.insert(taskSpecApprovals).values({ ...base, manifestHash: sha256("other") })).rejects.toThrow();
    const [approval] = await setup.database.insert(taskSpecApprovals).values({ ...base, manifestHash: created.manifestHash }).returning();
    for (const change of [{ approverUserId: setup.readerId }, { manifestHash: sha256("x") }, { approvedAt: new Date(0) }]) {
      const result = await setup.database.update(taskSpecApprovals).set(change).where(eq(taskSpecApprovals.id, approval!.id)).then(() => "", sqlText);
      expect(result).toContain("immutable");
    }
    await expect(setup.database.insert(taskSpecApprovals).values({ ...base, manifestHash: created.manifestHash })).rejects.toThrow();
  });

  it("IT-199 leaves approved planning immutable through the Spec wiring", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const result = await setup.database.update(taskPlanningDecisions).set({ selectedRoute: "tech_spec" }).where(eq(taskPlanningDecisions.taskId, setup.taskId)).then(() => "", sqlText);
    expect(result).toContain("immutable");
    expect((await setup.database.select().from(tasks))[0]).toMatchObject({ status: "published", planningStatus: "approved" });
  });

  it("protects workflow identity, captured documents and the approved-route precondition", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    const created = await seedReviewPackage(setup, started);
    const route = await setup.database.update(taskSpecWorkflows).set({ selectedRoute: "tech_spec" }).where(eq(taskSpecWorkflows.id, started.workflowId)).then(() => "", sqlText);
    expect(route).toContain("immutable");
    const document = await setup.database.update(taskSpecDocuments).set({ role: "other" }).where(eq(taskSpecDocuments.packageId, created.id)).then(() => "", sqlText);
    expect(document).toContain("immutable");
    const size = await setup.database.insert(taskSpecDocuments).values({ packageId: created.id, path: "a.md", role: "x", sourceText: "abc", byteCount: 2, sha256: sha256("abc") }).then(() => "", sqlText);
    expect(size).toContain("task_spec_documents_size_check");
    await setup.database.execute(`DELETE FROM task_spec_commands` as never).catch(() => undefined);
  });

  it("rejects a workflow for a task whose planning is not approved on the selected route", async () => {
    const setup = await specTask("prd", false);
    const decision = (await setup.database.select().from(taskPlanningDecisions))[0]!;
    const insert = setup.database.insert(taskSpecWorkflows).values({ taskId: setup.taskId, projectId: setup.project.id, authorUserId: setup.ownerId, publicationId: decision.publicationAttemptId, planningDecisionId: decision.id, selectedRoute: "prd", currentStage: "prd" });
    expect(await insert.then(() => "", sqlText)).toContain("approved selected planning route");
  });
});
