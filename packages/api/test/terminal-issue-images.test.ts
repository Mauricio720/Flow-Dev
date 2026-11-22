import { afterEach, describe, expect, it } from "vitest";
import { taskImages } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { approvedWork, cleanupTerminalFolders } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const imageId = (number: number) => `00000000-0000-4000-8000-0000000001${String(number).padStart(2, "0")}`;
const TASK_ID = "00000000-0000-4000-8000-000000000011";
const publishedUrl = (number: number) => `https://github.com/acme/private/blob/flow-dev-assets/issue-images/${TASK_ID}/${imageId(number)}.png?raw=true`;

async function worldWithImages(body: string, numbers: number[]) {
  const setup = await approvedWork(body);
  for (const number of numbers) {
    const content = new Uint8Array([...PNG, number]);
    await setup.database.insert(taskImages).values({ id: imageId(number), taskId: setup.taskId, projectId: setup.project.id, uploadedByUserId: setup.ownerId, contentType: "image/png", byteSize: content.byteLength, sha256: String(number).padStart(64, "0"), content });
  }
  const harness = await terminalHarness(setup);
  return { setup, preflight: () => harness.caller.terminal.preflight({ projectId: setup.project.id, taskId: setup.taskId }) };
}

describe("tasks.terminal.preflight issue images", () => {
  it("V-13a lists the images in the order of the body, from both reference formats, with name, type and size", async () => {
    const body = `Tela B: ![tela B](flow-image:${imageId(2)})\nTela A: ![tela A](${publishedUrl(1)})\n![](${publishedUrl(3)})`;
    const { preflight } = await worldWithImages(body, [1, 2, 3]);
    const { issueImages } = await preflight();
    expect(issueImages.map((image) => image.id)).toEqual([imageId(2), imageId(1), imageId(3)]);
    expect(issueImages[0]).toEqual({ id: imageId(2), name: "tela B", contentType: "image/png", byteSize: PNG.byteLength + 1, preselected: true });
    expect(issueImages[2]!.name).toBe("imagem-3.png");
  });

  it("V-13b preselects the first 10 of 12 images", async () => {
    const numbers = Array.from({ length: 12 }, (_value, index) => index + 1);
    const body = numbers.map((number) => `![i${number}](flow-image:${imageId(number)})`).join("\n");
    const { preflight } = await worldWithImages(body, numbers);
    const { issueImages } = await preflight();
    expect(issueImages).toHaveLength(12);
    expect(issueImages.map((image) => image.preselected)).toEqual([...Array(10).fill(true), false, false]);
  });

  it("ignores references to images that do not belong to the task", async () => {
    const { preflight } = await worldWithImages(`![x](flow-image:${imageId(9)})`, []);
    expect((await preflight()).issueImages).toEqual([]);
  });
});
