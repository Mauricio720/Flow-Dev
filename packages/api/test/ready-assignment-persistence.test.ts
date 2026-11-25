import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { DrizzleTaskPublicationDao } from "../src/infra/database/dao/tasks/drizzleTaskPublicationDao";
import { DrizzleTaskPublicationWorkerDao } from "../src/infra/database/dao/tasks/drizzleTaskPublicationWorkerDao";
import { taskPublicationAttempts } from "../src/infra/database/schema";
import { publicationCase } from "./task-publication-case";

let close: (() => Promise<void>) | undefined;
afterEach(async () => { await close?.(); close = undefined; });

describe("ready assignment persistence", () => {
  it("includes true in request identity, returns it to the worker, and records the result once", async () => {
    const setup = await publicationCase();
    close = setup.close;
    const preview = await setup.caller().preview({ projectId: setup.project.id, taskId: setup.taskId, revisionId: setup.revisionId });
    const dao = new DrizzleTaskPublicationDao(setup.state.database);
    const approval = { projectId: setup.project.id, taskId: setup.taskId, actorUserId: setup.state.member.id, sessionId: "00000000-0000-4000-8000-000000000091", requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", repositoryNodeId: "R_202", publisherGithubId: "88", owner: "acme", name: "private", previewHash: preview.previewHash, title: preview.title, bodyMarkdown: preview.bodyMarkdown, assignToSelf: true };
    const accepted = await dao.approve(approval);
    await expect(dao.accepted({ ...approval, assignToSelf: true })).resolves.toMatchObject({ attemptId: accepted.attemptId, created: true });
    await expect(dao.accepted({ ...approval, assignToSelf: false })).rejects.toMatchObject({ reason: "request_key_reused" });
    const workerDao = new DrizzleTaskPublicationWorkerDao(setup.state.database);
    const claim = await workerDao.claim("worker-ready");
    expect(claim?.assignToSelf).toBe(true);
    expect(await workerDao.recordReadyAssignment(claim!, "ready")).toBe(true);
    expect(await workerDao.recordReadyAssignment(claim!, "ready_failed")).toBe(false);
    const [stored] = await setup.state.database.select({ result: taskPublicationAttempts.readyAssignment }).from(taskPublicationAttempts).where(eq(taskPublicationAttempts.id, accepted.attemptId));
    expect(stored?.result).toBe("ready");
  });
});
