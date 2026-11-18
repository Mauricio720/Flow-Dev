import { describe, expect, it, vi } from "vitest";
import type { TaskDao } from "../application/database/dao/taskDao";
import type { TaskImageDao, TaskImageStored } from "../application/database/dao/taskImageDao";
import { ProjectUnavailableError } from "../application/services/access/projectAccessService";
import { TaskError } from "../application/services/tasks/taskErrors";
import { TaskImageController } from "./taskImageController";

const userId = "00000000-0000-4000-8000-000000000021";
const projectId = "00000000-0000-4000-8000-000000000001";
const taskId = "00000000-0000-4000-8000-000000000011";
const imageId = "00000000-0000-4000-8000-0000000000a1";
const actor = { userId, sessionId: "session-1" };
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const record = { id: imageId, taskId, projectId, contentType: "image/png", byteSize: png.byteLength, sha256: "s", createdAt: new Date() };

function setup(options: { status?: string; authorUserId?: string; stored?: TaskImageStored; readable?: boolean } = {}) {
  const tasks = { findScoped: vi.fn(async () => ({ id: taskId, projectId, authorUserId: options.authorUserId ?? userId, status: options.status ?? "draft_ready" })) };
  const images = { store: vi.fn(async () => options.stored ?? { status: "stored", image: record }), stage: vi.fn(async () => options.stored ?? { status: "stored", image: { ...record, taskId: null } }), find: vi.fn(async () => record), content: vi.fn(async () => png) };
  const requireRead = vi.fn(async () => { if (options.readable === false) throw new ProjectUnavailableError(); });
  const repositories = { requireRead, authoring: { requireAdmin: async () => {} } };
  return { controller: new TaskImageController(tasks as unknown as TaskDao, images as unknown as TaskImageDao, repositories as never), images };
}

describe("TaskImageController", () => {
  it("stores the image with its detected type and content hash for the task author", async () => {
    const { controller, images } = setup();
    await expect(controller.upload(actor, { projectId, taskId, content: png })).resolves.toEqual({ imageId, contentType: "image/png", byteSize: png.byteLength });
    expect(images.store).toHaveBeenCalledWith(expect.objectContaining({ taskId, projectId, uploadedByUserId: userId, contentType: "image/png", sha256: expect.stringMatching(/^[0-9a-f]{64}$/) }), 30);
  });

  it("refuses images from someone other than the author and after publication starts", async () => {
    await expect(setup({ authorUserId: "someone-else" }).controller.upload(actor, { projectId, taskId, content: png })).rejects.toThrowError(new TaskError("author_required"));
    await expect(setup({ status: "publishing" }).controller.upload(actor, { projectId, taskId, content: png })).rejects.toThrowError(new TaskError("task_complete"));
  });

  it("refuses content that is not an accepted image and tasks at the image limit", async () => {
    const { controller, images } = setup();
    await expect(controller.upload(actor, { projectId, taskId, content: new Uint8Array([0x3c, 0x73, 0x76, 0x67]) })).rejects.toThrowError(new TaskError("unsupported_image_type"));
    expect(images.store).not.toHaveBeenCalled();
    await expect(setup({ stored: { status: "limit_reached" } }).controller.upload(actor, { projectId, taskId, content: png })).rejects.toThrowError(new TaskError("image_limit"));
  });

  it("stages an image for the next message when no task exists yet", async () => {
    const { controller, images } = setup();
    await expect(controller.upload(actor, { projectId, taskId: null, content: png })).resolves.toEqual({ imageId, contentType: "image/png", byteSize: png.byteLength });
    expect(images.stage).toHaveBeenCalledWith(expect.objectContaining({ projectId, uploadedByUserId: userId, contentType: "image/png" }), 30);
    expect(images.store).not.toHaveBeenCalled();
    await expect(setup({ readable: false }).controller.upload(actor, { projectId, taskId: null, content: png })).rejects.toThrowError(new TaskError("project_unavailable"));
  });

  it("serves image bytes only to people who can read the project", async () => {
    await expect(setup().controller.read(actor, imageId)).resolves.toEqual({ contentType: "image/png", content: png });
    await expect(setup({ readable: false }).controller.read(actor, imageId)).rejects.toThrowError(new TaskError("project_unavailable"));
  });
});
