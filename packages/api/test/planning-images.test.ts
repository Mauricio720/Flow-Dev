import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskImages, taskOperations, tasks } from "../src/infra/database/schema";
import { buildPlanningInput } from "../src/application/services/tasks/planningRules";
import { DrizzleTaskPlanningWorkerDao } from "../src/infra/database/dao/tasks/drizzleTaskPlanningWorkerDao";
import { closeTaskFixture } from "./task-api-support";
import { ATTEMPT_ID, PLAN_OPERATION_ID, publishedTask, startPlanning } from "./planning-support";

const IMAGE_IDS = ["00000000-0000-4000-8000-0000000000b1", "00000000-0000-4000-8000-0000000000b2", "00000000-0000-4000-8000-0000000000b3"];
const FOREIGN_TASK_ID = "00000000-0000-4000-8000-000000000012";
afterEach(closeTaskFixture);

function publishedUrl(taskId: string, imageId: string) {
  return `https://github.com/acme/private/blob/flow-dev-assets/issue-images/${taskId}/${imageId}.png?raw=true`;
}

async function seedImage(setup: Awaited<ReturnType<typeof publishedTask>>, imageId: string, taskId = setup.taskId, byte = 1) {
  if (taskId === FOREIGN_TASK_ID) await setup.database.insert(tasks).values({ id: taskId, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 1 });
  const content = new Uint8Array([byte, byte + 1, byte + 2]);
  await setup.database.insert(taskImages).values({ id: imageId, taskId, projectId: setup.project.id, uploadedByUserId: setup.ownerId, contentType: "image/png", byteSize: content.length, sha256: byte.toString(16).padStart(2, "0").repeat(32), content });
  return content;
}

async function dispatchForBody(body: string, source: "legacy" | "snapshot") {
  const setup = await publishedTask("created", 7, body);
  const first = await seedImage(setup, IMAGE_IDS[0]!, setup.taskId, 1);
  const second = await seedImage(setup, IMAGE_IDS[1]!, setup.taskId, 4);
  const foreign = await seedImage(setup, IMAGE_IDS[2]!, FOREIGN_TASK_ID, 7);
  const operationId = source === "legacy" ? await seedLegacyOperation(setup, body) : (await startPlanning(setup)).operationId;
  const dao = new DrizzleTaskPlanningWorkerDao(setup.database);
  const claim = await dao.claim("planning-images");
  const dispatch = await dao.input(claim!);
  return { setup, dispatch, first, second, operationId };
}

async function seedLegacyOperation(setup: Awaited<ReturnType<typeof publishedTask>>, bodyMarkdown: string) {
  const inputHash = buildPlanningInput({ outcome: "created", taskId: setup.taskId, repositoryBindingMatches: true, attemptId: ATTEMPT_ID, repositoryId: "202", repositoryNodeId: "R_202", issueId: "4101", issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", title: "Título", bodyMarkdown }, { operationId: PLAN_OPERATION_ID, executionId: "legacy-execution", taskId: setup.taskId }).inputHash;
  await setup.database.insert(taskOperations).values({ id: PLAN_OPERATION_ID, taskId: setup.taskId, kind: "plan", state: "queued", initiatedSessionId: setup.sessionId, requesterUserId: setup.ownerId, baseTaskVersion: 7, publicationAttemptId: ATTEMPT_ID, inputHash });
  await setup.database.update(tasks).set({ planningStatus: "in_progress", planningOperationId: PLAN_OPERATION_ID, activeOperationId: PLAN_OPERATION_ID }).where(eq(tasks.id, setup.taskId));
  return PLAN_OPERATION_ID;
}

describe("planning input images with PostgreSQL", () => {
  it("V-03a through V-03c reads Flow Dev links in order and omits foreign ids without fetching external links", async () => {
    const taskId = "00000000-0000-4000-8000-000000000011";
    const body = `![erro](${publishedUrl(taskId, IMAGE_IDS[0]!)})\n![tela](${publishedUrl(taskId, IMAGE_IDS[1]!)})\n![outra tarefa](${publishedUrl(taskId, IMAGE_IDS[2]!)})\n![externa](https://github.com/user-attachments/assets/00000000-0000-4000-8000-000000000099)`;
    const result = await dispatchForBody(body, "legacy");
    expect(result.dispatch.images.map(({ id, content, origin }) => ({ id, content, origin }))).toEqual([
      { id: IMAGE_IDS[0], content: result.first, origin: { kind: "issue_body", position: 1, caption: "erro" } },
      { id: IMAGE_IDS[1], content: result.second, origin: { kind: "issue_body", position: 2, caption: "tela" } },
    ]);
    expect(result.dispatch.omittedImages).toEqual([{ id: IMAGE_IDS[2], origin: { kind: "issue_body", position: 3, caption: "outra tarefa" }, reason: "unavailable" }]);
    expect(result.dispatch.images.map(({ id }) => id)).not.toContain(IMAGE_IDS[2]);
  });

  it("V-03d adds snapshot images without changing the stored input hash", async () => {
    const taskId = "00000000-0000-4000-8000-000000000011";
    const body = `![snapshot](${publishedUrl(taskId, IMAGE_IDS[0]!)})`;
    const result = await dispatchForBody(body, "snapshot");
    const [operation] = await result.setup.database.select().from(taskOperations).where(eq(taskOperations.id, result.operationId));
    expect(operation?.sourceFormatVersion).toBe(2);
    expect(result.dispatch.images.map(({ id, content, origin }) => ({ id, content, origin }))).toEqual([{ id: IMAGE_IDS[0], content: result.first, origin: { kind: "issue_body", position: 1, caption: "snapshot" } }]);
    expect(result.dispatch.inputHash).toBe(operation?.inputHash);
  });
});
