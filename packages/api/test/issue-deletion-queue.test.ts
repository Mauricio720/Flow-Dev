import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { issueDeletionOperations, taskIssueSources, tasks } from "../src/infra/database/schema";
import { issueDeletionFixture, closeIssueDeletion, resetIssueDeletion, seedTask, type IssueDeletionFixture } from "./issue-deletion-support";

let f: IssueDeletionFixture;
beforeAll(async () => { f = await issueDeletionFixture(); });
beforeEach(() => resetIssueDeletion(f));
afterAll(closeIssueDeletion);

async function previewQueue(userId = f.admin.id) {
  return f.caller(userId).preview({ kind: "queue", projectId: f.project.id, issueNodeId: "I_fixture_41" });
}

async function createQueueDeletion(userId: string, fingerprint: string) {
  return f.caller(userId).start({ target: { kind: "queue", projectId: f.project.id, issueNodeId: "I_fixture_41" }, fingerprint, requestKey: crypto.randomUUID() });
}

describe("issueDeletion Ready queue journey", () => {
  it("IT-017 deletes an unclaimed Ready Issue without creating a task", async () => {
    const preview = await previewQueue();
    const start = await createQueueDeletion(f.admin.id, preview.fingerprint);
    await f.drain();
    expect((await f.caller(f.admin.id).status({ operationId: start.operationId })).state).toBe("completed");
    expect(await f.database.select().from(tasks)).toHaveLength(0);
    expect(f.world.issue).toBeNull();
  });

  it("IT-018 denies an assignee who is neither Issue author nor Flow Dev admin", async () => {
    const preview = await previewQueue(f.second.id);
    expect(preview.canDelete).toBe(false);
    const denied = await createQueueDeletion(f.second.id, preview.fingerprint).catch((error: { code: string }) => error);
    expect(denied).toMatchObject({ code: "FORBIDDEN" });
    expect(f.world.mutations).toHaveLength(0);
  });

  it("IT-021 attaches a task claimed after preview to the same frozen Issue", async () => {
    const preview = await previewQueue();
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: null, origin: "external", status: "imported" });
    await f.database.insert(taskIssueSources).values({ id: crypto.randomUUID(), taskId, projectId: f.project.id, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: "I_fixture_41", issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", origin: "external", publicationAttemptId: null });
    const start = await createQueueDeletion(f.admin.id, preview.fingerprint);
    await f.drain();
    expect((await f.caller(f.admin.id).status({ operationId: start.operationId })).state).toBe("completed");
    expect(await f.database.select().from(tasks).where(eq(tasks.id, taskId))).toHaveLength(0);
  });

  it("IT-054 attaches a claimed task before a worker can claim a queue deletion", async () => {
    const preview = await previewQueue();
    const taskId = await seedTask(f.database, { projectId: f.project.id, authorUserId: null, origin: "external", status: "imported" });
    await f.database.insert(taskIssueSources).values({ id: crypto.randomUUID(), taskId, projectId: f.project.id, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: "I_fixture_41", issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", origin: "external", publicationAttemptId: null });
    const reserve = f.dao.reserve.bind(f.dao);
    f.dao.reserve = async (input) => {
      const result = await reserve(input);
      if (input.reservation.kind === "queue") await f.worker.tick();
      return result;
    };
    const start = await createQueueDeletion(f.admin.id, preview.fingerprint);
    const [operation] = await f.database.select().from(issueDeletionOperations).where(eq(issueDeletionOperations.id, start.operationId));
    expect(operation?.taskId).toBe(taskId);
    await f.drain();
    expect(await f.database.select().from(tasks).where(eq(tasks.id, taskId))).toHaveLength(0);
    expect(f.world.issue).toBeNull();
  });

  it("IT-022 keeps exact-node author access after Ready state and assignee change", async () => {
    const preview = await previewQueue(f.member.id);
    f.world.issue!.state = "CLOSED";
    f.world.issue!.assigneeDatabaseId = 99;
    const start = await createQueueDeletion(f.member.id, preview.fingerprint);
    await f.drain();
    expect((await f.caller(f.member.id).status({ operationId: start.operationId })).state).toBe("completed");
    expect(f.world.issue).toBeNull();
  });
});
