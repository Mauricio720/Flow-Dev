import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeTaskFixture } from "./task-api-support";
import { DrizzleTaskSpecDao } from "../src/infra/database/dao/spec/drizzleTaskSpecDao";
import { rejection, specCaller, specScope, specTask, startInput } from "./spec-support";
import { seedQuestion, seedReviewPackage, startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

describe("spec reads", () => {
  it("IT-151 returns the selected route, state, permissions, pending question and cursor without history", async () => {
    const setup = await specTask("prd");
    const started = await startWorkflow(setup);
    const question = await seedQuestion(setup, started);
    const detail = await specCaller(setup).byTask(specScope(setup));
    expect(detail).toMatchObject({ route: "prd", state: "waiting_question", specVersion: 1, currentStage: "prd", permissions: { isAuthor: true, canStart: false } });
    expect(detail.pendingInteractions).toEqual([expect.objectContaining({ id: question.id, choices: ["Thirty days", "Ninety days"], delivery: "pending" })]);
    expect(detail.eventCursor).toEqual(expect.any(String));
    expect(detail).not.toHaveProperty("events");
  });

  it("UT-013 maps saved rows into one scoped workflow snapshot and an empty not-started result", async () => {
    const setup = await specTask("tech_spec");
    const dao = new DrizzleTaskSpecDao(setup.database);
    expect((await dao.snapshot(specScope(setup))).workflow).toBeNull();
    const empty = await specCaller(setup).byTask(specScope(setup));
    expect(empty).toMatchObject({ state: "not_started", specVersion: 0, route: "tech_spec", permissions: { canStart: true, nextStartableStage: "tech_spec" } });
    await startWorkflow(setup, "tech_spec");
    const snapshot = await dao.snapshot(specScope(setup));
    expect(snapshot.workflow).toMatchObject({ selectedRoute: "tech_spec", version: 1, state: "queued" });
    expect(snapshot.stages.map((stage) => stage.stage).sort()).toEqual(["tasks", "tech_spec"]);
  });

  it("UT-014 never resolves nested resources outside the scoped workflow", async () => {
    const setup = await specTask();
    const dao = new DrizzleTaskSpecDao(setup.database);
    await startWorkflow(setup);
    const missing = crypto.randomUUID();
    const reasonOf = (call: () => Promise<unknown>) => call().then(() => null, (error: { reason?: string }) => error.reason);
    expect(await reasonOf(() => dao.package({ ...specScope(setup), packageId: missing }))).toBe("spec_unavailable");
    expect(await reasonOf(() => dao.event({ ...specScope(setup), eventId: missing }))).toBe("spec_unavailable");
    expect(await reasonOf(() => dao.package({ projectId: setup.project.id, taskId: missing, packageId: missing }))).toBe("spec_unavailable");
  });

  it("IT-156 returns unknown for an unused key and the original receipt for an accepted key", async () => {
    const setup = await specTask();
    const caller = specCaller(setup);
    const input = startInput(setup);
    const receipt = await caller.start(input);
    const unused = await caller.submission({ ...specScope(setup), action: "spec.start", requestKey: crypto.randomUUID() });
    expect(unused).toEqual({ status: "unknown" });
    expect(await caller.submission({ ...specScope(setup), action: "spec.start", requestKey: input.requestKey })).toEqual({ status: "known", receipt });
  });

  it("IT-016 and IT-017 replay the original receipt without another attempt", async () => {
    const setup = await specTask();
    const caller = specCaller(setup);
    const input = startInput(setup);
    const first = await caller.start(input);
    const started = { workflowId: (await caller.byTask(specScope(setup))).stages.length ? "" : "", attemptId: first.attemptId! };
    expect(started.attemptId).toBe(first.attemptId);
    const again = await caller.start(input);
    expect(again).toEqual(first);
    const replayed = await caller.submission({ ...specScope(setup), action: "spec.start", requestKey: input.requestKey });
    expect(replayed).toMatchObject({ status: "known", receipt: { attemptId: first.attemptId } });
  });

  it("serves review package metadata, documents and block pages from saved snapshots", async () => {
    const setup = await specTask();
    const started = await startWorkflow(setup);
    const created = await seedReviewPackage(setup, started);
    const caller = specCaller(setup);
    const list = await caller.packages({ ...specScope(setup), limit: 20 });
    expect(list.items).toEqual([expect.objectContaining({ id: created.id, captureState: "review_ready" })]);
    const detail = await caller.package({ ...specScope(setup), packageId: created.id });
    const page = await caller.document({ ...specScope(setup), packageId: created.id, documentId: detail.documents[0]!.id, limit: 2 });
    expect(page).toMatchObject({ totalBlocks: 3, sourceText: "# Documento\n\nConteúdo", nextCursor: expect.any(String) });
    const rest = await caller.document({ ...specScope(setup), packageId: created.id, documentId: detail.documents[0]!.id, limit: 2, cursor: page.nextCursor! });
    expect(rest).toMatchObject({ nextCursor: null, blocks: [{ id: "b3" }] });
  });

  it("rejects cursors from another scope or direction with invalid_cursor", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const caller = specCaller(setup);
    const { eventCursor } = await caller.byTask(specScope(setup));
    expect(await rejection(caller.events({ ...specScope(setup), before: eventCursor!, limit: 10 }))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_cursor" });
    expect(await rejection(caller.events({ ...specScope(setup), after: "tampered.value", limit: 10 }))).toMatchObject({ reason: "invalid_cursor" });
    expect(await caller.events({ ...specScope(setup), after: eventCursor!, limit: 10 })).toMatchObject({ items: [], hasMore: false });
  });
});
