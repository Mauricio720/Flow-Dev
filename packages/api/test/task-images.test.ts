import { afterEach, describe, expect, it, vi } from "vitest";
import { taskImages } from "../src/infra/database/schema";
import { DrizzleTaskImageDao } from "../src/infra/database/dao/tasks/drizzleTaskImageDao";
import { publicationCase } from "./task-publication-case";
import { draft } from "./task-api-support";

const imageId = "00000000-0000-4000-8000-0000000000a1";
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7, 0, 255]);
const imageDraft = { ...draft, context: `O total permanece antigo\n![tela do carrinho](flow-image:${imageId})` };
const imageUrl = (taskId: string) => `https://github.com/acme/private/blob/flow-dev-assets/issue-images/${taskId}/${imageId}.png?raw=true`;
let scenario: Awaited<ReturnType<typeof publicationCase>> | undefined;
afterEach(async () => { await scenario?.close(); scenario = undefined; });

async function withImage(options: Parameters<typeof publicationCase>[0]) {
  scenario = await publicationCase({ draft: imageDraft, ...options });
  await scenario.state.database.insert(taskImages).values({ id: imageId, taskId: scenario.taskId, projectId: scenario.project.id, uploadedByUserId: scenario.state.member.id, contentType: "image/png", byteSize: png.byteLength, sha256: "a".repeat(64), content: png });
  return scenario;
}

describe("task images with PostgreSQL", () => {
  it("stores bytes exactly, deduplicates by content hash and enforces the per-task limit", async () => {
    scenario = await publicationCase();
    const dao = new DrizzleTaskImageDao(scenario.state.database);
    const input = { taskId: scenario.taskId, projectId: scenario.project.id, uploadedByUserId: scenario.state.member.id, contentType: "image/png", sha256: "b".repeat(64), content: png };
    const first = await dao.store(input, 2);
    const again = await dao.store(input, 2);
    expect(first.status === "stored" && again.status === "stored" && again.image.id === first.image.id).toBe(true);
    if (first.status !== "stored") return;
    expect(await dao.content(first.image.id)).toEqual(png);
    await dao.store({ ...input, sha256: "c".repeat(64) }, 2);
    await expect(dao.store({ ...input, sha256: "d".repeat(64) }, 2)).resolves.toEqual({ status: "limit_reached" });
    await expect(dao.find("not-a-uuid")).resolves.toBeNull();
  });

  it("previews the final GitHub address and commits the image before creating the issue", async () => {
    const order: string[] = [];
    const imageStore = { put: vi.fn(async () => { order.push("image"); }) };
    const current = await withImage({ imageStore, eligibility: { canWriteContents: true } });
    const caller = current.caller();
    const preview = await caller.preview({ projectId: current.project.id, taskId: current.taskId, revisionId: current.revisionId });
    expect(preview.bodyMarkdown).toContain(`![tela do carrinho](${imageUrl(current.taskId)})`);
    await caller.publish({ projectId: current.project.id, taskId: current.taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId: current.revisionId, repositoryId: "202", previewHash: preview.previewHash });
    const create = vi.spyOn(current.github, "create").mockImplementation(async () => { order.push("issue"); return { status: "created", receipt: { issueId: "4101", nodeId: "ISSUE41", number: 41, url: "https://github.com/acme/private/issues/41", repositoryId: "202", publisherGithubId: "88", createdAt: "2026-10-01T12:00:00.000Z" } }; });
    await expect(current.worker.tick()).resolves.toBe(true);
    expect(order).toEqual(["image", "issue"]);
    expect(imageStore.put).toHaveBeenCalledWith(expect.objectContaining({ owner: "acme", name: "private", branch: "flow-dev-assets", path: `issue-images/${current.taskId}/${imageId}.png`, content: png }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ body: preview.bodyMarkdown }));
  });

  it("refuses the preview when the publisher cannot write to the repository", async () => {
    const current = await withImage({ imageStore: { put: vi.fn() }, eligibility: { canWriteContents: false } });
    await expect(current.caller().preview({ projectId: current.project.id, taskId: current.taskId, revisionId: current.revisionId })).rejects.toMatchObject({ cause: { reason: "image_permission_denied" } });
  });
});
