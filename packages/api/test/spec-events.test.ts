import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { taskSpecEvents } from "../src/infra/database/schema";
import type { Database } from "../src/infra/database/client";
import { appendInTransaction } from "../src/infra/database/dao/spec/specWorkerSettlement";
import { closeTaskFixture } from "./task-api-support";
import { rejection, specCaller, specScope, specTask } from "./spec-support";
import { seedReviewPackage, startWorkflow } from "./spec-seed";
import { fakeDeps } from "./spec-worker-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

async function claimed() {
  const setup = await specTask();
  const started = await startWorkflow(setup);
  const { deps } = fakeDeps(setup);
  const claim = (await deps.dao.claim({ owner: "w", now: new Date(), maxActive: 2 }))!;
  const append = (count: number, text = "mensagem") => Promise.all(Array.from({ length: count }, (_, index) => deps.dao.appendEvent(claim, { kind: "agent_message", payload: { text: `${text} ${index}`, omitted: [] }, providerEventId: `provider-${index}` })));
  return { setup, started, deps, claim, append, caller: specCaller(setup) };
}

describe("taskSpec.events", () => {
  it("IT-152 pages a 51-event history in ascending order with a signed next cursor", async () => {
    const { setup, caller } = await claimed();
    await setup.database.execute(`INSERT INTO task_spec_events (workflow_id, sequence, attempt_id, kind, payload, provider_event_id) SELECT workflow_id, g, id, 'agent_message', '{}'::jsonb, 'bulk-' || g FROM task_spec_attempts, generate_series(1, 51) g` as never);
    const first = await caller.events({ ...specScope(setup), limit: 50 });
    expect(first.items.map((event) => event.sequence)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
    expect(first).toMatchObject({ hasMore: true, nextCursor: expect.any(String) });
    const second = await caller.events({ ...specScope(setup), after: first.nextCursor!, limit: 50 });
    expect(second).toMatchObject({ hasMore: false, items: [expect.objectContaining({ sequence: 51 })] });
  });

  it("IT-157 returns the full 20,000-byte safe detail for one event", async () => {
    const { setup, deps, claim, caller } = await claimed();
    await deps.dao.appendEvent(claim, { kind: "agent_message", payload: { text: "x".repeat(20_000), omitted: [] }, providerEventId: "big" });
    const [saved] = await setup.database.select().from(taskSpecEvents);
    const detail = await caller.event({ ...specScope(setup), eventId: saved!.id });
    expect(Buffer.byteLength((detail.payload as { text: string }).text)).toBe(20_000);
    expect(JSON.stringify(detail)).not.toMatch(/authorization|raw/i);
  });

  it("IT-029 keeps events associated with the failed attempt", async () => {
    const { setup, started, deps, claim, append, caller } = await claimed();
    await append(2);
    await deps.dao.settle(claim, { state: "failed", reason: "runtime_failed" });
    const page = await caller.events({ ...specScope(setup), limit: 50 });
    expect(page.items.filter((event) => event.kind === "agent_message").map((event) => event.attemptId)).toEqual([started.attemptId, started.attemptId]);
    expect(page.items.at(-1)?.kind).toBe("attempt.failed");
  });

  it("IT-024 denies the next protected page after membership is revoked", async () => {
    const { setup, append, caller } = await claimed();
    await append(3);
    const first = await caller.events({ ...specScope(setup), limit: 2 });
    await setup.database.execute(`DELETE FROM project_assignments` as never);
    expect(await rejection(caller.events({ ...specScope(setup), after: first.nextCursor!, limit: 2 }))).toMatchObject({ code: "FORBIDDEN", reason: "access_revoked" });
  });

  it("IT-175 rejects cursors with a bad signature, scope or direction", async () => {
    const { setup, started, caller } = await claimed();
    const created = await seedReviewPackage(setup, started);
    const detail = await caller.package({ ...specScope(setup), packageId: created.id });
    const valid = (await caller.byTask(specScope(setup))).eventCursor!;
    expect(await rejection(caller.events({ ...specScope(setup), after: "tampered.sig", limit: 5 }))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_cursor" });
    expect(await rejection(caller.events({ ...specScope(setup), before: valid, limit: 5 }))).toMatchObject({ reason: "invalid_cursor" });
    expect(await rejection(caller.packages({ ...specScope(setup), cursor: valid, limit: 5 }))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_cursor" });
    expect(await rejection(caller.document({ ...specScope(setup), packageId: created.id, documentId: detail.documents[0]!.id, cursor: valid, limit: 5 }))).toMatchObject({ reason: "invalid_cursor" });
  });

  it("IT-206 keeps a later sequence hidden until the earlier transaction commits", async () => {
    const { setup, deps, claim, caller } = await claimed();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const first = setup.database.transaction(async (tx) => { await appendInTransaction(tx as unknown as Database, claim, { kind: "agent_message", payload: { text: "A" }, providerEventId: "a" }); await hold; });
    await new Promise((resolve) => setTimeout(resolve, 150));
    const second = deps.dao.appendEvent(claim, { kind: "agent_message", payload: { text: "B" }, providerEventId: "b" });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect((await caller.events({ ...specScope(setup), limit: 10 })).items).toHaveLength(0);
    release();
    await first;
    expect(await second).toBe(2);
    expect((await caller.events({ ...specScope(setup), limit: 10 })).items.map((event) => event.sequence)).toEqual([1, 2]);
  });
});
