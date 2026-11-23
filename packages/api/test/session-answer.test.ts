import { afterEach, describe, expect, it } from "vitest";
import { rejection } from "./planning-support";
import { insertPendingRequest, moveClaimTo, openedFlowDevSession, requestRow } from "./session-interaction-support";
import { CHECKS, COMPLETE, FREE_TEXT_LIMIT, VISIBILITY, answerQuestion } from "./session-request-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.session.answerQuestion", () => {
  it("stores the validated answers, who answered and when, and marks the request answered", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "question");
    expect(await answerQuestion(world, request.id)).toEqual({ requestId: request.id, status: "answered" });
    const stored = await requestRow(world.setup, request.id);
    expect(stored).toMatchObject({ status: "answered", answeredBy: world.setup.ownerId, answer: { answers: { [VISIBILITY]: "Só membros (Recomendado)", [CHECKS]: ["lint", "test"] } } });
    expect(stored.answeredAt).not.toBeNull();
  });

  it("V-23f answers the first call and refuses the second with request_answered, keeping the stored answer", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "question");
    await answerQuestion(world, request.id);
    const again = { ...COMPLETE, [VISIBILITY]: { labels: ["Qualquer pessoa"] } };
    const error = await answerQuestion(world, request.id, again).then(() => null, (caught: { code: string; message: string; cause?: { reason: string } }) => caught);
    expect(error).toMatchObject({ code: "CONFLICT", message: "Este pedido já foi respondido." });
    expect(error?.cause?.reason).toBe("request_answered");
    expect((await requestRow(world.setup, request.id)).answer).toEqual({ answers: { [VISIBILITY]: "Só membros (Recomendado)", [CHECKS]: ["lint", "test"] } });
  });

  it("V-23f refuses an answer to a cancelled request with request_closed and changes nothing", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "question");
    await world.setup.client`update task_terminal_requests set status = 'cancelled' where id = ${request.id}`;
    const error = await answerQuestion(world, request.id).then(() => null, (caught: { code: string; message: string }) => caught);
    expect(error).toMatchObject({ code: "CONFLICT", message: "Este pedido não está mais aberto." });
    expect(await requestRow(world.setup, request.id)).toMatchObject({ status: "cancelled", answer: null });
  });

  it("lets only one of two concurrent answers win and tells the other it was already answered", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "question");
    const outcomes = await Promise.all([answerQuestion(world, request.id).then(() => "ok", () => "refused"), answerQuestion(world, request.id).then(() => "ok", () => "refused")]);
    expect(outcomes.sort()).toEqual(["ok", "refused"]);
  });

  it("V-22c refuses a label that is not in the request and an Other over the limit, leaving the request pending", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "question");
    const unknown = { ...COMPLETE, [VISIBILITY]: { labels: ["Ninguém"] } };
    expect(await rejection(answerQuestion(world, request.id, unknown))).toMatchObject({ code: "BAD_REQUEST", reason: "answer_invalid" });
    const tooLong = { ...COMPLETE, [VISIBILITY]: { labels: [], other: "z".repeat(FREE_TEXT_LIMIT + 1) } };
    expect(await rejection(answerQuestion(world, request.id, tooLong))).toMatchObject({ reason: "answer_invalid" });
    expect(await requestRow(world.setup, request.id)).toMatchObject({ status: "pending", answer: null });
  });

  it("V-22b refuses an answer set that leaves a question without answer", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "question");
    expect(await rejection(answerQuestion(world, request.id, { [VISIBILITY]: COMPLETE[VISIBILITY]! }))).toMatchObject({ code: "BAD_REQUEST", reason: "answer_incomplete" });
    expect((await requestRow(world.setup, request.id)).status).toBe("pending");
  });

  it("refuses a person who did not open the session, the person who stopped being the operator and a permission request", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "question");
    const asReader = world.harness.callerFor(world.setup.readerId).session.answerQuestion({ projectId: world.scope.projectId, taskId: world.scope.taskId, requestId: request.id, answers: COMPLETE });
    expect(await rejection(asReader)).toMatchObject({ code: "FORBIDDEN", reason: "session_control_denied" });
    const permission = await insertPendingRequest(world, "permission");
    expect(await rejection(answerQuestion(world, permission.id))).toMatchObject({ reason: "answer_invalid" });
    await moveClaimTo(world.setup, world.setup.readerId);
    expect(await rejection(answerQuestion(world, request.id))).toMatchObject({ code: "FORBIDDEN", reason: "session_control_denied" });
    expect((await requestRow(world.setup, request.id)).status).toBe("pending");
  });
});
