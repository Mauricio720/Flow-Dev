import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { projectAssignments, taskEvidence, taskOperations, taskToolActivity } from "../src/infra/database/schema";
import { DrizzleIssueContextDao } from "../src/infra/database/dao/tasks/drizzleIssueContextDao";
import { DrizzleWorkerOperationDao } from "../src/infra/database/dao/tasks/drizzleTaskOperationDao";
import { IssueContextController } from "../src/controllers/issueContextController";
import { closeTaskFixture, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

describe("scoped task context with PostgreSQL", () => {
  it("UT-017/IT-069 persists repository evidence and measured tool activity", async () => {
    const setup = await taskFixture();
    const accepted = await setup.caller.start({ projectId: setup.project.id, requestKey: "00000000-0000-4000-8000-000000000088", message: "Corrigir total" });
    const claim = await new DrizzleWorkerOperationDao(setup.database).claim("worker-1");
    const gateway = scopedGateway();
    const context = new IssueContextController(new DrizzleIssueContextDao(setup.database), setup.repositoryAccess, gateway);
    const result = await context.handle({ executionId: claim!.executionId, toolCallId: "tool-call-1", request: { tool: "readProjectFile", path: "src/cart.ts", fromLine: 8, toLine: 12 } }, claim!.contextCapability);
    expect(result).toMatchObject({ status: "done", evidenceIds: [expect.any(String)] });
    expect(await setup.database.select().from(taskEvidence)).toMatchObject([{ repositoryId: "202", path: "src/cart.ts", fromLine: 8, toLine: 12, commitSha: "a".repeat(40) }]);
    expect(await setup.database.select().from(taskToolActivity)).toMatchObject([{ taskId: accepted.taskId, operationId: accepted.operationId, toolCallId: "tool-call-1", status: "done" }]);
    await context.handle({ executionId: claim!.executionId, toolCallId: "tool-call-1", request: { tool: "readProjectFile", path: "src/cart.ts", fromLine: 8, toLine: 12 } }, claim!.contextCapability);
    expect(gateway.execute).toHaveBeenCalledTimes(1);
  });

  it("IT-070 rejects paths outside the selected repository before GitHub access", async () => {
    const setup = await taskFixture();
    await setup.caller.start({ projectId: setup.project.id, requestKey: "00000000-0000-4000-8000-000000000089", message: "Corrigir total" });
    const claim = await new DrizzleWorkerOperationDao(setup.database).claim("worker-1");
    const gateway = scopedGateway();
    const context = new IssueContextController(new DrizzleIssueContextDao(setup.database), setup.repositoryAccess, gateway);
    await expect(context.handle({ executionId: claim!.executionId, toolCallId: "tool-call-1", request: { tool: "readProjectFile", path: "../private.env", fromLine: 8, toLine: 12 } }, claim!.contextCapability)).rejects.toMatchObject({ reason: "invalid_path" });
    expect(gateway.execute).not.toHaveBeenCalled();
  });

  it("IT-071 rejects an invalid capability before GitHub access", async () => {
    const setup = await taskFixture();
    await setup.caller.start({ projectId: setup.project.id, requestKey: "00000000-0000-4000-8000-000000000092", message: "Corrigir total" });
    const claim = await new DrizzleWorkerOperationDao(setup.database).claim("worker-1");
    const gateway = scopedGateway();
    const context = new IssueContextController(new DrizzleIssueContextDao(setup.database), setup.repositoryAccess, gateway);
    await expect(context.handle({ executionId: claim!.executionId, toolCallId: "tool-call-1", request: { tool: "searchProject", query: "cart" } }, "wrong-capability" )).rejects.toMatchObject({ reason: "capability_invalid" });
    expect(gateway.execute).not.toHaveBeenCalled();
  });

  it("IT-072 rechecks assignment access before every repository lookup", async () => {
    const setup = await taskFixture();
    await setup.caller.start({ projectId: setup.project.id, requestKey: "00000000-0000-4000-8000-000000000093", message: "Corrigir total" });
    const claim = await new DrizzleWorkerOperationDao(setup.database).claim("worker-1");
    await setup.database.delete(projectAssignments).where(eq(projectAssignments.userId, setup.ownerId));
    const gateway = scopedGateway();
    const context = new IssueContextController(new DrizzleIssueContextDao(setup.database), setup.repositoryAccess, gateway);
    await expect(context.handle({ executionId: claim!.executionId, toolCallId: "tool-call-1", request: { tool: "searchProject", query: "cart" } }, claim!.contextCapability)).rejects.toMatchObject({ reason: "access_revoked" });
    expect(gateway.execute).not.toHaveBeenCalled();
  });

  it("IT-073 fences a context capability after a later worker claim", async () => {
    const setup = await taskFixture();
    const accepted = await setup.caller.start({ projectId: setup.project.id, requestKey: "00000000-0000-4000-8000-000000000090", message: "Corrigir total" });
    const worker = new DrizzleWorkerOperationDao(setup.database);
    const stale = await worker.claim("worker-1");
    await setup.database.update(taskOperations).set({ leaseUntil: new Date(Date.now() - 60_000) }).where(eq(taskOperations.id, accepted.operationId));
    const current = await worker.claim("worker-2");
    const gateway = scopedGateway();
    const context = new IssueContextController(new DrizzleIssueContextDao(setup.database), setup.repositoryAccess, gateway);
    await expect(context.handle({ executionId: stale!.executionId, toolCallId: "tool-call-1", request: { tool: "searchProject", query: "cart" } }, stale!.contextCapability)).rejects.toMatchObject({ reason: "stale_execution" });
    expect(current?.fence).toBe(2);
    expect(gateway.execute).not.toHaveBeenCalled();
  });
});

function scopedGateway() {
  return { pinCommit: vi.fn(async () => "a".repeat(40)), execute: vi.fn(async () => ({ status: "done" as const, data: { path: "src/cart.ts" }, evidence: [{ type: "project-file" as const, path: "src/cart.ts", commitSha: "a".repeat(40), fromLine: 8, toLine: 12, issueId: null, issueNumber: null, url: null, sourceHash: "b".repeat(64), excerpt: "total = subtotal + tax" }] })) };
}
