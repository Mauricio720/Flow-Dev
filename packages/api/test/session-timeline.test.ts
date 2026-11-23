import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskTerminalMessages, taskTerminalRequests } from "../src/infra/database/schema";
import { QUESTIONS_PAYLOAD, insertPendingRequest, openedFlowDevSession } from "./session-interaction-support";
import { at, seedEntries, timeline } from "./session-timeline-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.session.timeline", () => {
  it("V-27e returns the 200 most recent entries oldest first with the hidden count", async () => {
    const world = await openedFlowDevSession();
    await seedEntries(world, 210);
    const page = await timeline(world);
    expect(page.entries).toHaveLength(200);
    expect(page.hiddenEntries).toBe(10);
    expect(page.entries.map((entry) => entry.at)).toEqual(Array.from({ length: 200 }, (_, index) => at(index + 10).toISOString()));
    expect(page.entries[0]).toMatchObject({ type: "event", summary: "evento 10" });
  });

  it("V-27e returns only the new message when the cursor is sent, and nothing at the next call", async () => {
    const world = await openedFlowDevSession();
    await seedEntries(world, 6);
    const first = await timeline(world);
    const [message] = await world.setup.database.insert(taskTerminalMessages).values({ sessionId: world.sessionId, role: "assistant", content: "nova", occurredAt: at(100) }).returning();
    const next = await timeline(world, first.cursor);
    expect(next.entries.map((entry) => entry.id)).toEqual([message!.id]);
    expect(next.hiddenEntries).toBe(0);
    expect((await timeline(world, next.cursor)).entries).toEqual([]);
  });

  it("sends again an entry whose state changed after the cursor: answered request, delivered message and undelivered message", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "question");
    await world.setup.database.update(taskTerminalRequests).set({ createdAt: at(1) }).where(eq(taskTerminalRequests.id, request.id));
    const queued = await world.harness.caller.session.send({ ...world.scope, content: "Rode o lint", requestKey: crypto.randomUUID() });
    await world.setup.database.update(taskTerminalMessages).set({ occurredAt: at(2) }).where(eq(taskTerminalMessages.id, queued.message.id));
    const first = await timeline(world);
    expect(first.entries.map((entry) => [entry.type, "queued" in entry ? entry.queued : entry.type === "question" ? entry.status : null])).toEqual([["question", "pending"], ["message", true]]);
    expect(first.pending.requestIds).toEqual([request.id]);
    const answers = { [QUESTIONS_PAYLOAD.questions[0]!.question]: "Qualquer pessoa" };
    await world.setup.database.update(taskTerminalRequests).set({ status: "answered", answer: { answers }, answeredAt: at(10) }).where(eq(taskTerminalRequests.id, request.id));
    await world.setup.database.update(taskTerminalMessages).set({ deliveredAt: at(11) }).where(eq(taskTerminalMessages.id, queued.message.id));
    const changed = await timeline(world, first.cursor);
    expect(changed.entries).toMatchObject([{ type: "question", id: request.id, status: "answered", answers }, { type: "message", id: queued.message.id, queued: false }]);
    expect(changed.pending.requestIds).toEqual([]);
    await world.setup.database.update(taskTerminalMessages).set({ undelivered: true }).where(eq(taskTerminalMessages.id, queued.message.id));
    expect((await timeline(world, changed.cursor)).entries).toMatchObject([{ id: queued.message.id, undelivered: true, queued: false }]);
  });

  it("shows a permission with its tool, display, suggested rule, decision and reason", async () => {
    const world = await openedFlowDevSession();
    const request = await insertPendingRequest(world, "permission");
    await world.setup.database.update(taskTerminalRequests).set({ status: "answered", answer: { decision: "deny", reason: "Só rode o lint" }, answeredAt: at(5) }).where(eq(taskTerminalRequests.id, request.id));
    const [entry] = (await timeline(world)).entries;
    expect(entry).toMatchObject({ type: "permission", status: "answered", tool: "Bash", display: { title: "Rodar comando:", body: "pnpm test" }, suggestedRule: "Bash(pnpm test:*)", decision: "deny", reason: "Só rode o lint" });
  });
});
