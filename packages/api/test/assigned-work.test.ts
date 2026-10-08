import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { projectAssignments, taskIssueSnapshots } from "../src/infra/database/schema";
import { encodeBoundCursor } from "../src/application/services/assigned-issues/assignedIssueCursor";
import { assignedFixture, closeAssigned, rejection, resetAssigned, type AssignedFixture } from "./assigned-support";
import { issue } from "./assigned-world";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

const scope = (taskId: string, projectId = f.project.id) => ({ projectId, taskId });
const active = (userId: string, filter: "mine" | "shared" = "mine", limit = 20, cursor?: string) => f.caller(userId).active({ projectId: f.project.id, filter, limit, cursor });

describe("assigned work reads", () => {
  it("IT-090 reports the durable claim status with a distinct pending claimant", async () => {
    const { taskId } = await f.caller(f.u1.id).claim(f.claimInput());
    expect(await f.caller(f.u1.id).claimStatus(scope(taskId))).toEqual({ taskId, state: "claimed", operatorId: f.u1.id, reason: null });
    expect(await f.caller(f.u2.id).claimStatus(scope(taskId))).toMatchObject({ state: "claimed", operatorId: f.u1.id });
  });

  it("IT-091 and IT-101 hide inaccessible work behind work_unavailable", async () => {
    const { taskId } = await f.caller(f.u1.id).claim(f.claimInput());
    await f.database.delete(projectAssignments).where(eq(projectAssignments.userId, f.u2.id));
    for (const call of [() => f.caller(f.u2.id).claimStatus(scope(taskId)), () => f.caller(f.u2.id).byTask(scope(taskId))]) expect(await rejection(call())).toMatchObject({ code: "NOT_FOUND", reason: "work_unavailable" });
    expect(await rejection(f.caller(f.u1.id).byTask(scope(crypto.randomUUID())))).toMatchObject({ code: "NOT_FOUND", reason: "work_unavailable" });
  });

  it("IT-100 returns the pinned source, safe detail and operator capability", async () => {
    const { taskId } = await f.caller(f.u1.id).claim(f.claimInput());
    const [snapshot] = await f.database.select().from(taskIssueSnapshots);
    const operator = await f.caller(f.u1.id).byTask(scope(taskId));
    expect(operator).toMatchObject({ taskId, sourceSnapshotId: snapshot!.id, viewerCanOperate: true, reason: null, source: { revision: 1, origin: "external", title: "Issue 41", issueNumber: 41 }, claim: { state: "claimed", operatorId: f.u1.id } });
    expect(await f.caller(f.u2.id).byTask(scope(taskId))).toMatchObject({ viewerCanOperate: false, reason: "operator_required" });
  });

  it("explains that an unclaimed published task has no operator", async () => {
    const { seedPublication, PUBLISHED } = await import("./assigned-publish-support");
    await seedPublication(f, "created");
    await f.sourcesDao.resolve({ identity: { projectId: f.project.id, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: "I_fixture_41" }, issueNumber: 41, issueUrl: "u", snapshot: { title: "t", bodyMarkdown: "b", githubUpdatedAt: new Date(), contentHash: "c".repeat(64), verifiedAt: new Date(), verifiedByUserId: f.u1.id } });
    expect(await f.caller(f.u1.id).claimStatus(scope(PUBLISHED.taskId))).toEqual({ taskId: PUBLISHED.taskId, state: "unclaimed", operatorId: null, reason: null });
    expect(await f.caller(f.u1.id).byTask(scope(PUBLISHED.taskId))).toMatchObject({ viewerCanOperate: false, reason: "claim_required" });
  });
});

describe("assignedIssues.active", () => {
  it("IT-098 lists claimed work for mine and shared filters independent of Ready", async () => {
    const { taskId } = await f.caller(f.u1.id).claim(f.claimInput());
    expect(await active(f.u1.id)).toMatchObject({ items: [{ taskId, operatorId: f.u1.id, issueNumber: 41, title: "Issue 41" }], nextCursor: null });
    expect((await active(f.u2.id)).items).toHaveLength(0);
    expect((await active(f.u2.id, "shared")).items.map((entry) => entry.taskId)).toEqual([taskId]);
  });

  it("IT-003 pages 51 claimed items with a cursor and no duplicates", async () => {
    for (let index = 0; index < 51; index += 1) {
      f.world.add({ id: `PVTI_bulk_${index}`, issue: issue(5000 + index, [88]) });
      await f.caller(f.u1.id).claim({ projectId: f.project.id, issueNodeId: `I_fixture_${5000 + index}`, boardItemId: `PVTI_bulk_${index}`, requestKey: crypto.randomUUID() });
    }
    const first = await active(f.u1.id, "mine", 50);
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).not.toBeNull();
    const second = await active(f.u1.id, "mine", 50, first.nextCursor!);
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items].map((entry) => entry.taskId)).size).toBe(51);
  }, 60_000);

  it("IT-099 rejects cursors bound to another project, filter or actor", async () => {
    const foreign = encodeBoundCursor({ projectId: "10000000-0000-4000-8000-000000000002", actorId: f.u1.id, boardId: "mine" }, { claimedAt: new Date().toISOString(), id: crypto.randomUUID() });
    expect(await rejection(active(f.u1.id, "mine", 20, foreign))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_cursor" });
    const wrongFilter = encodeBoundCursor({ projectId: f.project.id, actorId: f.u1.id, boardId: "shared" }, { claimedAt: new Date().toISOString(), id: crypto.randomUUID() });
    expect(await rejection(active(f.u1.id, "mine", 20, wrongFilter))).toMatchObject({ reason: "invalid_cursor" });
    const malformed = encodeBoundCursor({ projectId: f.project.id, actorId: f.u1.id, boardId: "mine" }, { claimedAt: "nope" });
    expect(await rejection(active(f.u1.id, "mine", 20, malformed))).toMatchObject({ reason: "invalid_cursor" });
  });
});
