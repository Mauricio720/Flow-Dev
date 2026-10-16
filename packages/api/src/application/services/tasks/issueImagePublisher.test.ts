import { describe, expect, it, vi } from "vitest";
import type { TaskImageDao } from "../../database/dao/taskImageDao";
import { IssueImagePublisher } from "./issueImagePublisher";
import { TaskError } from "./taskErrors";

const taskId = "00000000-0000-4000-8000-000000000011";
const imageId = "00000000-0000-4000-8000-0000000000a1";
const image = { id: imageId, taskId, projectId: "p", contentType: "image/jpeg", byteSize: 3, sha256: "s", createdAt: new Date() };
const destination = { owner: "acme", name: "cart", token: "private-token" };

function setup(stored = [image]) {
  const images = { forTask: vi.fn(async () => stored), content: vi.fn(async () => new Uint8Array([1, 2, 3])) };
  const store = { put: vi.fn(async () => {}) };
  return { publisher: new IssueImagePublisher(images as unknown as TaskImageDao, store), images, store };
}

describe("IssueImagePublisher", () => {
  it("leaves a body without images untouched and writes nothing", async () => {
    const { publisher, images, store } = setup();
    await expect(publisher.resolve(taskId, "Sem imagens", destination)).resolves.toBe("Sem imagens");
    await publisher.upload({ taskId, body: "Sem imagens", destination });
    expect(images.forTask).not.toHaveBeenCalled();
    expect(store.put).not.toHaveBeenCalled();
  });

  it("commits each referenced image to the assets branch at its deterministic path", async () => {
    const { publisher, images, store } = setup();
    await publisher.upload({ taskId, body: `![a](flow-image:${imageId})`, destination });
    expect(images.forTask).toHaveBeenCalledWith(taskId, [imageId]);
    expect(store.put).toHaveBeenCalledWith(expect.objectContaining({ owner: "acme", name: "cart", token: "private-token", branch: "flow-dev-assets", path: `issue-images/${taskId}/${imageId}.jpg`, content: new Uint8Array([1, 2, 3]) }));
  });

  it("stops before writing when a referenced image is missing", async () => {
    const { publisher, store } = setup([]);
    await expect(publisher.upload({ taskId, body: `![a](flow-image:${imageId})`, destination })).rejects.toThrowError(new TaskError("image_unavailable"));
    expect(store.put).not.toHaveBeenCalled();
  });
});
