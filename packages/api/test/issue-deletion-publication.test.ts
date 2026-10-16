import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import { issueDeletionFixture, closeIssueDeletion, resetIssueDeletion, seedTask, type IssueDeletionFixture } from "./issue-deletion-support";

let f: IssueDeletionFixture;
beforeAll(async () => { f = await issueDeletionFixture(); });
beforeEach(() => resetIssueDeletion(f));
afterAll(closeIssueDeletion);

describe("issueDeletion publication reconciliation", () => {
  it("IT-030 adopts and removes an exact Issue created after deletion starts", async () => {
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: f.member.id, status: "publishing", publicationOutcome: "dispatching" });
    const target = { kind: "task" as const, projectId: f.project.id, taskId };
    const preview = await f.caller(f.member.id).preview(target);
    const start = await f.caller(f.member.id).start({ target, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
    const [attempt] = await f.database.select().from(taskPublicationAttempts).where(eq(taskPublicationAttempts.taskId, taskId));
    await f.database.update(taskPublicationAttempts).set({ outcome: "created", issueId: "4101", issueNodeId: "I_fixture_41", issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41" }).where(eq(taskPublicationAttempts.id, attempt!.id));
    await f.drain();
    expect((await f.caller(f.member.id).status({ operationId: start.operationId })).state).toBe("completed");
    expect(await f.database.select().from(tasks).where(eq(tasks.id, taskId))).toHaveLength(0);
    expect(f.world.mutations).toEqual(["deleteIssue:accepted"]);
  });
});
