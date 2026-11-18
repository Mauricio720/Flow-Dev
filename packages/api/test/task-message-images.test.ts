import { afterEach, describe, expect, it, vi } from "vitest";
import { taskImages, taskMessages } from "../src/infra/database/schema";
import { DrizzleTaskImageDao } from "../src/infra/database/dao/tasks/drizzleTaskImageDao";
import { publicationCase } from "./task-publication-case";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 0, 255]);
const sessionId = "00000000-0000-4000-8000-000000000091";
const messageId = "00000000-0000-4000-8000-0000000000c1";
const imageId = "00000000-0000-4000-8000-0000000000b1";
let scenario: Awaited<ReturnType<typeof publicationCase>> | undefined;
afterEach(async () => { await scenario?.close(); scenario = undefined; });

async function staged(current: NonNullable<typeof scenario>, uploadedByUserId = current.state.member.id) {
  const stored = await new DrizzleTaskImageDao(current.state.database).stage({ projectId: current.project.id, uploadedByUserId, contentType: "image/png", sha256: "e".repeat(64), content: png }, 30);
  if (stored.status !== "stored") throw new Error("image was not staged");
  return stored.image.id;
}

function sendWith(current: NonNullable<typeof scenario>, imageIds: string[], requestKey = "00000000-0000-4000-8000-0000000000d1") {
  return current.taskDao.send({ projectId: current.project.id, taskId: current.taskId, actorUserId: current.state.member.id, sessionId, requestKey, expectedVersion: 7, message: "Segue a captura da tela de falha", imageIds }, "refinement");
}

describe("message images with PostgreSQL", () => {
  it("binds staged images to the accepted message and lists them with it", async () => {
    scenario = await publicationCase();
    const image = await staged(scenario);
    const receipt = await sendWith(scenario, [image]);
    const page = await scenario.taskDao.messages(scenario.taskId, undefined, 30);
    expect(page.items.find((message) => message.id === receipt.acceptedMessageId)?.imageIds).toEqual([image]);
    await expect(new DrizzleTaskImageDao(scenario.state.database).attachments(scenario.taskId)).resolves.toEqual([{ id: image, taskId: scenario.taskId, contentType: "image/png" }]);
  });

  it("refuses images that someone else staged and keeps the message unsent", async () => {
    scenario = await publicationCase();
    const image = await staged(scenario, scenario.state.admin.id);
    await expect(sendWith(scenario, [image])).rejects.toMatchObject({ reason: "attachment_unavailable" });
    expect((await scenario.taskDao.messages(scenario.taskId, undefined, 30)).items).toEqual([]);
  });

  it("publishes message images in their own section and commits them before the issue", async () => {
    const imageStore = { put: vi.fn(async () => undefined) };
    scenario = await publicationCase({ imageStore, eligibility: { canWriteContents: true } });
    await scenario.state.database.insert(taskMessages).values({ id: messageId, taskId: scenario.taskId, sequence: 1, role: "user", kind: "intent", content: "Pagamento falha" });
    await scenario.state.database.insert(taskImages).values({ id: imageId, taskId: scenario.taskId, messageId, projectId: scenario.project.id, uploadedByUserId: scenario.state.member.id, contentType: "image/png", byteSize: png.byteLength, sha256: "f".repeat(64), content: png });
    const preview = await scenario.caller().preview({ projectId: scenario.project.id, taskId: scenario.taskId, revisionId: scenario.revisionId });
    expect(preview.bodyMarkdown).toContain(`## Imagens anexadas\n\n![Imagem anexada 1](https://github.com/acme/private/blob/flow-dev-assets/issue-images/${scenario.taskId}/${imageId}.png?raw=true)`);
    await scenario.caller().publish({ projectId: scenario.project.id, taskId: scenario.taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId: scenario.revisionId, repositoryId: "202", previewHash: preview.previewHash });
    await expect(scenario.worker.tick()).resolves.toBe(true);
    expect(imageStore.put).toHaveBeenCalledWith(expect.objectContaining({ path: `issue-images/${scenario.taskId}/${imageId}.png`, content: png }));
    expect(scenario.calls.create).toBe(1);
  });
});
