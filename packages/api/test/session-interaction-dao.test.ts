import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { DrizzleSessionMessageDao } from "../src/infra/database/dao/terminal/drizzleSessionMessageDao";
import { DrizzleSessionRequestDao } from "../src/infra/database/dao/terminal/drizzleSessionRequestDao";
import { flowDevWorld } from "./session-interaction-support";
import { closeTaskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

const NOW = new Date("2026-11-23T14:32:00Z");
const QUESTION = { questions: [{ question: "Qual?", header: "Q", options: [{ label: "A", description: "a" }], multiSelect: false }] };

async function pendingQuestion() {
  const { setup, session } = await flowDevWorld();
  const requests = new DrizzleSessionRequestDao(setup.database);
  const request = await requests.insertRequest({ sessionId: session.id, kind: "question", toolUseId: "toolu_1", payload: QUESTION });
  return { setup, session, requests, request };
}

describe("session request DAO", () => {
  it("V-23e lets exactly one of two concurrent answers win and keeps the winner's answer", async () => {
    const { setup, requests, request } = await pendingQuestion();
    const answer = (label: string) => requests.answerIfPending({ requestId: request.id, answer: { Qual: label }, answeredBy: setup.ownerId, at: NOW });
    const results = await Promise.all([answer("A"), answer("B")]);
    const winners = results.filter((result) => result !== null);
    expect(winners).toHaveLength(1);
    const stored = await requests.findById(request.id);
    expect(stored).toMatchObject({ status: "answered", answer: winners[0]!.answer, answeredBy: setup.ownerId });
  });

  it("returns null and changes nothing when the request is already cancelled", async () => {
    const { setup, session, requests, request } = await pendingQuestion();
    await requests.cancelPending(session.id, NOW);
    const result = await requests.answerIfPending({ requestId: request.id, answer: { Qual: "A" }, answeredBy: setup.ownerId, at: NOW });
    expect(result).toBeNull();
    expect(await requests.findById(request.id)).toMatchObject({ status: "cancelled", answer: null });
  });

  it("rejects answers after the parent session is final", async () => {
    const { setup, session, requests, request } = await pendingQuestion();
    await setup.database.update(taskTerminalSessions).set({ status: "ended" }).where(eq(taskTerminalSessions.id, session.id));
    const result = await requests.answerIfPending({ requestId: request.id, answer: { Qual: "A" }, answeredBy: setup.ownerId, at: NOW });
    expect(result).toBeNull();
    expect(await requests.findById(request.id)).toMatchObject({ status: "pending", answer: null });
  });

  it("refuses to insert a request after the parent session is final", async () => {
    const { setup, session, requests } = await pendingQuestion();
    await setup.database.update(taskTerminalSessions).set({ status: "ended" }).where(eq(taskTerminalSessions.id, session.id));
    await expect(requests.insertRequest({ sessionId: session.id, kind: "question", toolUseId: "toolu_late", payload: QUESTION })).rejects.toThrow("session_request_closed");
  });

  it("refuses request creation and answers after an end control is persisted", async () => {
    const { setup, session, requests, request } = await pendingQuestion();
    await setup.database.update(taskTerminalSessions).set({ endRequestedAt: NOW }).where(eq(taskTerminalSessions.id, session.id));
    expect(await requests.answerIfPending({ requestId: request.id, answer: { Qual: "A" }, answeredBy: setup.ownerId, at: NOW })).toBeNull();
    await expect(requests.insertRequest({ sessionId: session.id, kind: "question", toolUseId: "toolu_late", payload: QUESTION })).rejects.toThrow("session_request_closed");
  });

  it("cancels only the pending requests of the session and lists the answered ones by id", async () => {
    const { setup, session, requests, request } = await pendingQuestion();
    const other = await requests.insertRequest({ sessionId: session.id, kind: "permission", toolUseId: "toolu_2", payload: { toolName: "Bash", title: "t", body: "b", truncated: false, suggestedRule: null, suggestions: [] } });
    await requests.answerIfPending({ requestId: request.id, answer: { Qual: "A" }, answeredBy: setup.ownerId, at: NOW });
    expect(await requests.pendingIds(session.id)).toEqual([other.id]);
    expect(await requests.cancelPending(session.id, NOW)).toEqual([other.id]);
    const answered = await requests.listAnsweredFor([request.id, other.id]);
    expect(answered.map((row) => row.id)).toEqual([request.id]);
    expect(await requests.listAnsweredFor([])).toEqual([]);
  });
});

describe("session message DAO", () => {
  it("stores one user message per request key and returns the same row on a repeat", async () => {
    const { setup, session } = await flowDevWorld();
    const messages = new DrizzleSessionMessageDao(setup.database);
    const requestKey = crypto.randomUUID();
    const first = await messages.insertUserMessage({ sessionId: session.id, content: "oi", requestKey });
    const repeat = await messages.insertUserMessage({ sessionId: session.id, content: "oi de novo", requestKey });
    expect(first.created).toBe(true);
    expect(repeat).toMatchObject({ created: false, message: { id: first.message.id, content: "oi" } });
  });

  it("lists only queued user messages in order and drops them once delivered or marked undelivered", async () => {
    const { setup, session } = await flowDevWorld();
    const messages = new DrizzleSessionMessageDao(setup.database);
    const queued = (content: string) => messages.insertUserMessage({ sessionId: session.id, content, requestKey: crypto.randomUUID() });
    const [a, b, c] = [await queued("A"), await queued("B"), await queued("C")];
    await messages.insertAssistantMessage({ sessionId: session.id, content: "resposta", truncated: false });
    await messages.insertSystemMessage({ sessionId: session.id, content: "nota" });
    expect((await messages.listUndelivered(session.id)).map((row) => row.content)).toEqual(["A", "B", "C"]);
    await messages.markDelivered([a.message.id], NOW);
    await messages.markUndelivered([b.message.id]);
    expect((await messages.listUndelivered(session.id)).map((row) => row.id)).toEqual([c.message.id]);
  });
});
