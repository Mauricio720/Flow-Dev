import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskDraftRevisions, taskOperations, taskPublicationAttempts, tasks, users } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { addPublishedTask, INPUT_HASH, planningBase, planningCaller, publishedTask } from "./planning-support";

afterEach(closeTaskFixture);

const GLOBAL_ACTIVE_BEFORE_START = 99;
const ACTIVE_PER_SEED_AUTHOR = 5;

type Setup = Awaited<ReturnType<typeof publishedTask>>;

async function seedActivePlans(setup: Setup) {
  const authorCount = Math.ceil(GLOBAL_ACTIVE_BEFORE_START / ACTIVE_PER_SEED_AUTHOR);
  const authors = await setup.database.insert(users).values(Array.from({ length: authorCount }, (_, index) => ({ name: `Seed ${index}`, email: `seed${index}@test.invalid` }))).returning();
  const rows = Array.from({ length: GLOBAL_ACTIVE_BEFORE_START }, (_, index) => ({ id: crypto.randomUUID(), authorUserId: authors[Math.floor(index / ACTIVE_PER_SEED_AUTHOR)]!.id }));
  await setup.database.insert(tasks).values(rows.map((row) => ({ id: row.id, projectId: setup.project.id, authorUserId: row.authorUserId, repositoryId: "202", repositoryNodeId: "R_202", status: "published", version: 3, title: "Ativa" })));
  await seedPublications(setup, rows.map((row) => row.id));
}

async function seedPublications(setup: Setup, taskIds: string[]) {
  const draft = { title: "t", context: "c", objective: "o", constraints: [], relevantContext: [], productConsiderations: [], references: [] };
  const rows = taskIds.map((taskId) => ({ taskId, revisionId: crypto.randomUUID(), publishId: crypto.randomUUID(), attemptId: crypto.randomUUID(), planId: crypto.randomUUID() }));
  await setup.database.insert(taskDraftRevisions).values(rows.map((row) => ({ id: row.revisionId, taskId: row.taskId, revisionNumber: 1, canonicalDraft: draft, createdByUserId: setup.ownerId })));
  await setup.database.insert(taskOperations).values(rows.map((row) => ({ id: row.publishId, taskId: row.taskId, kind: "publish", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: 3 })));
  await setup.database.insert(taskPublicationAttempts).values(rows.map((row) => ({ id: row.attemptId, taskId: row.taskId, operationId: row.publishId, revisionId: row.revisionId, publisherUserId: setup.ownerId, publisherGithubId: "88", repositoryId: "202", repositoryNodeId: "R_202", approvedOwner: "acme", approvedName: "private", previewHash: "h", titleSnapshot: "T", bodySnapshot: "B", approvalSessionId: setup.sessionId, outcome: "created", issueId: row.attemptId, issueNodeId: "I", issueNumber: 1, issueUrl: "https://github.com/acme/private/issues/1", issueCreatedAt: new Date() })));
  await setup.database.insert(taskOperations).values(rows.map((row) => ({ id: row.planId, taskId: row.taskId, kind: "plan", state: "queued", initiatedSessionId: setup.sessionId, baseTaskVersion: 3, publicationAttemptId: row.attemptId, inputHash: INPUT_HASH })));
  for (const row of rows) await setup.database.update(tasks).set({ planningStatus: "in_progress", planningOperationId: row.planId, activeOperationId: row.planId }).where(eq(tasks.id, row.taskId));
}

const activePlans = async (setup: Setup) => (await setup.database.select().from(taskOperations).where(eq(taskOperations.kind, "plan"))).filter((row) => ["queued", "running"].includes(row.state));

describe("planning global admission with PostgreSQL", () => {
  it("IT-011 accepts only one of two concurrent starts when 99 plans are active", async () => {
    const setup = await publishedTask();
    await seedActivePlans(setup);
    await setup.authorize(setup.readerId);
    const otherTaskId = await addPublishedTask(setup, { authorId: setup.readerId });
    const results = await Promise.allSettled([
      planningCaller(setup, setup.ownerId).planning.start(planningBase(setup)),
      planningCaller(setup, setup.readerId).planning.start(planningBase(setup, 3, otherTaskId)),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toMatchObject({ code: "TOO_MANY_REQUESTS", cause: { reason: "planning_capacity" } });
    expect(await activePlans(setup)).toHaveLength(GLOBAL_ACTIVE_BEFORE_START + 1);
  });
});
