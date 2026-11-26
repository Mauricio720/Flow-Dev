import { afterEach, describe, expect, it } from "vitest";
import { taskImages, tasks } from "../src/infra/database/schema";
import { findTaskImageMetadata, readTaskImageContents } from "../src/infra/database/dao/tasks/taskImageReads";
import { publicationCase } from "./task-publication-case";

const BYTES_A = new Uint8Array([1, 2, 3]);
const BYTES_B = new Uint8Array([4, 5, 6]);
const BYTES_C = new Uint8Array([7, 8, 9]);
const OTHER_TASK_ID = "00000000-0000-4000-8000-000000000012";
const IMAGE_IDS = ["00000000-0000-4000-8000-0000000000a1", "00000000-0000-4000-8000-0000000000a2", "00000000-0000-4000-8000-0000000000a3"];
let scenario: Awaited<ReturnType<typeof publicationCase>> | undefined;
afterEach(async () => { await scenario?.close(); scenario = undefined; });

describe("agent image reads with PostgreSQL", () => {
  it("V-02i returns only requested content and metadata owned by the task", async () => {
    scenario = await publicationCase();
    await scenario.state.database.insert(tasks).values({ id: OTHER_TASK_ID, projectId: scenario.project.id, authorUserId: scenario.state.member.id, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 1 });
    const images = [
      { id: IMAGE_IDS[0]!, taskId: scenario.taskId, content: BYTES_A },
      { id: IMAGE_IDS[1]!, taskId: scenario.taskId, content: BYTES_B },
      { id: IMAGE_IDS[2]!, taskId: OTHER_TASK_ID, content: BYTES_C },
    ];
    for (const [index, image] of images.entries()) await scenario.state.database.insert(taskImages).values({ ...image, projectId: scenario.project.id, uploadedByUserId: scenario.state.member.id, contentType: "image/png", byteSize: image.content.byteLength, sha256: String(index).repeat(64) });
    const input = { taskId: scenario.taskId, ids: [IMAGE_IDS[0]!, IMAGE_IDS[2]!] };
    await expect(readTaskImageContents(scenario.state.database, input)).resolves.toEqual(new Map([[IMAGE_IDS[0]!, BYTES_A]]));
    await expect(findTaskImageMetadata(scenario.state.database, input)).resolves.toEqual([{ id: IMAGE_IDS[0]!, messageId: null, contentType: "image/png", byteSize: 3, createdAt: expect.any(Date) }]);
    await expect(readTaskImageContents(scenario.state.database, { taskId: scenario.taskId, ids: [] })).resolves.toEqual(new Map());
    await expect(findTaskImageMetadata(scenario.state.database, { taskId: scenario.taskId, ids: [] })).resolves.toEqual([]);
  });
});
