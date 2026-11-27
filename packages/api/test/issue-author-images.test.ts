import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskImages } from "../src/infra/database/schema";
import { closeTaskFixture, taskFixture } from "./task-api-support";
import { addDraftImage, addForeignImage, completeAndRefine, initialGeneration, stageImage, startWithImages } from "./issue-author-images-support";

afterEach(closeTaskFixture);

describe("Issue Author generation images with PostgreSQL", () => {
  it("V-02a returns attachments from messages 1 and 3 in conversation order", async () => {
    const setup = await taskFixture();
    const first = await stageImage(setup, 8);
    const third = await stageImage(setup, 9);
    const accepted = await startWithImages(setup, [first]);
    const input = await completeAndRefine(setup, accepted.taskId, [], [third]);
    expect(input.images.map(({ id, origin, content }) => ({ id, origin, content }))).toEqual([
      { id: first.id, origin: { kind: "message", messageNumber: 1 }, content: first.content },
      { id: third.id, origin: { kind: "message", messageNumber: 3 }, content: third.content },
    ]);
    expect(input.omittedImages).toEqual([]);
  });

  it("V-02a through V-02e and V-02g loads conversation and draft references safely", async () => {
    const setup = await taskFixture();
    const messageOne = await stageImage(setup, 1);
    const messageThree = await stageImage(setup, 2);
    const accepted = await startWithImages(setup, [messageOne]);
    const draftImage = await addDraftImage(setup, accepted.taskId, 3);
    const foreign = await addForeignImage(setup, 4);
    const orphan = await addDraftImage(setup, accepted.taskId, 5);
    const missingId = "00000000-0000-4000-8000-000000000099";
    const input = await completeAndRefine(setup, accepted.taskId, [draftImage.id, messageOne.id, foreign.id, missingId], [messageThree]);
    expect(input.images.map(({ id, origin, content }) => ({ id, origin, content }))).toEqual([
      { id: messageOne.id, origin: { kind: "message", messageNumber: 1 }, content: messageOne.content },
      { id: messageThree.id, origin: { kind: "message", messageNumber: 3 }, content: messageThree.content },
      { id: draftImage.id, origin: { kind: "draft", caption: "tela atual" }, content: draftImage.content },
    ]);
    expect(input.omittedImages.map(({ id, origin, reason }) => ({ id, origin, reason }))).toEqual([
      { id: foreign.id, origin: { kind: "draft", caption: `caption-${foreign.id.slice(-2)}` }, reason: "unavailable" },
      { id: missingId, origin: { kind: "draft", caption: "caption-99" }, reason: "unavailable" },
    ]);
    expect(input.images.map(({ id }) => id)).not.toContain(orphan.id);
  });

  it("V-02f gives a first generation without a base draft only its message attachments", async () => {
    const setup = await taskFixture();
    const attachment = await stageImage(setup, 7);
    const input = await initialGeneration(setup, [attachment]);
    expect(input.baseRevisionId).toBeNull();
    expect(input.currentDraft).toBeNull();
    expect(input.images.map(({ id, origin, content }) => ({ id, origin, content }))).toEqual([{ id: attachment.id, origin: { kind: "message", messageNumber: 1 }, content: attachment.content }]);
    expect(input.omittedImages).toEqual([]);
  });

  it("V-02h selects the ten newest attachments and reads only their bytes", async () => {
    const setup = await taskFixture();
    const first = await Promise.all(Array.from({ length: 10 }, (_, index) => stageImage(setup, index + 1, 100_000)));
    for (const [index, image] of first.entries()) await setup.database.update(taskImages).set({ createdAt: new Date(`2026-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`) }).where(eq(taskImages.id, image.id));
    const accepted = await startWithImages(setup, first);
    const latest = await Promise.all([stageImage(setup, 11, 100_000), stageImage(setup, 12, 100_000)]);
    for (const [index, image] of latest.entries()) await setup.database.update(taskImages).set({ createdAt: new Date(`2026-01-${String(index + 11).padStart(2, "0")}T00:00:00Z`) }).where(eq(taskImages.id, image.id));
    const input = await completeAndRefine(setup, accepted.taskId, [], latest);
    expect(input.images.map(({ id }) => id)).toEqual([...first.slice(2).map(({ id }) => id), ...latest.map(({ id }) => id)]);
    expect(input.images.map(({ content }) => content.byteLength)).toEqual(Array(10).fill(100_000));
    expect(input.omittedImages.map(({ id, reason }) => [id, reason])).toEqual(first.slice(0, 2).map(({ id }) => [id, "limit"]));
  });
});
