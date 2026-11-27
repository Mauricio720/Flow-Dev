import { eq } from "drizzle-orm";
import { taskImages, tasks } from "../src/infra/database/schema";
import { DrizzleTaskImageDao } from "../src/infra/database/dao/tasks/drizzleTaskImageDao";
import { DrizzleWorkerOperationDao } from "../src/infra/database/dao/tasks/drizzleTaskOperationDao";
import { draft, taskFixture } from "./task-api-support";

export const IMAGE_DRAFT = (references: string[]) => ({ ...draft, context: references.length ? references.map((id, index) => `![${index === 0 ? "tela atual" : `caption-${id.slice(-2)}`}](flow-image:${id})`).join("\n") : draft.context });
export type ImageFixture = Awaited<ReturnType<typeof taskFixture>>;

export async function stageImage(setup: ImageFixture, byte: number, byteSize = 3) {
  const content = new Uint8Array(byteSize).fill(byte);
  const stored = await new DrizzleTaskImageDao(setup.database).stage({ projectId: setup.project.id, uploadedByUserId: setup.ownerId, contentType: "image/png", sha256: byte.toString(16).padStart(2, "0").repeat(32), content }, 30);
  if (stored.status !== "stored") throw new Error("image staging failed");
  return { id: stored.image.id, content };
}

export async function startWithImages(setup: ImageFixture, images: Array<{ id: string; content: Uint8Array }>) {
  return setup.caller.start({ projectId: setup.project.id, requestKey: crypto.randomUUID(), message: "Describe these images", imageIds: images.map(({ id }) => id) });
}

export async function completeAndRefine(setup: ImageFixture, taskId: string, draftImageIds: string[], nextImages: Array<{ id: string; content: Uint8Array }> = []) {
  const worker = new DrizzleWorkerOperationDao(setup.database);
  const first = await worker.claim("image-worker");
  await worker.completeGeneration(first!, { protocolVersion: 1, operationId: first!.operationId, executionId: first!.executionId, result: { status: "draft_ready", draft: IMAGE_DRAFT(draftImageIds) }, activity: [] });
  const task = await setup.taskDao.findScoped(setup.project.id, taskId);
  await setup.caller.send({ projectId: setup.project.id, taskId, requestKey: crypto.randomUUID(), expectedVersion: task!.version, message: "Refine this request", imageIds: nextImages.map(({ id }) => id) });
  const claim = await worker.claim("image-worker");
  return worker.generationInput(claim!);
}

export async function addDraftImage(setup: ImageFixture, taskId: string, byte: number) {
  const image = await stageImage(setup, byte);
  await setup.database.update(taskImages).set({ taskId }).where(eq(taskImages.id, image.id));
  return image;
}

export async function addForeignImage(setup: ImageFixture, byte: number) {
  const taskId = "00000000-0000-4000-8000-000000000012";
  await setup.database.insert(tasks).values({ id: taskId, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 1 });
  const image = await stageImage(setup, byte);
  await setup.database.update(taskImages).set({ taskId }).where(eq(taskImages.id, image.id));
  return image;
}

export async function initialGeneration(setup: ImageFixture, images: Array<{ id: string; content: Uint8Array }>) {
  await startWithImages(setup, images);
  const worker = new DrizzleWorkerOperationDao(setup.database);
  return worker.generationInput((await worker.claim("image-worker"))!);
}
