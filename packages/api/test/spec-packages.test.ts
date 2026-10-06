import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { taskSpecAttempts, taskSpecDocuments, taskSpecPackages, taskSpecStages } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { finalizationRoots, harness } from "./spec-finalization-support";
import { specCaller, specScope } from "./spec-support";
import { sha256 } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("captured package reads", () => {
  it("IT-153 returns twenty revision rows and a continuation cursor for 21 saved packages", async () => {
    const { setup, started } = await harness();
    await setup.database.execute(`INSERT INTO task_spec_packages (workflow_id, stage, attempt_id, revision, manifest_hash, capture_state, package_index) SELECT '${started.workflowId}', 'tech_spec', '${started.attemptId}', g, lpad(to_hex(g), 64, '0'), 'partial', '{}'::jsonb FROM generate_series(1, 21) g` as never);
    const caller = specCaller(setup);
    const first = await caller.packages({ ...specScope(setup), limit: 20 });
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).toEqual(expect.any(String));
    const second = await caller.packages({ ...specScope(setup), limit: 20, cursor: first.nextCursor! });
    expect(second.items).toHaveLength(1);
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(21);
  });

  it("IT-154 and IT-057 return the exact manifest, document identities, index and diagnostics on every fetch", async () => {
    const { setup, claim, prepare, finalization } = await harness();
    const saved = await prepare();
    await finalization().finalize(claim, saved.packageId);
    const caller = specCaller(setup);
    const first = await caller.package({ ...specScope(setup), packageId: saved.packageId });
    expect(first).toMatchObject({ manifestHash: saved.manifestHash, captureState: "review_ready", isCurrent: true, approval: null, diagnostics: [] });
    expect(first.documents.map((document) => document.path)).toEqual([".flow-spec-tech_spec.json", "_techspec.md", "_tests.md"]);
    expect(first.relations.tests).toHaveLength(2);
    expect(first.sections.length).toBe(3);
    expect(await caller.package({ ...specScope(setup), packageId: saved.packageId })).toEqual(first);
  });

  it("IT-059 keeps V1 readable but not current when the stage is no longer in review", async () => {
    const { setup, claim, prepare, finalization } = await harness();
    const saved = await prepare();
    await finalization().finalize(claim, saved.packageId);
    await setup.database.update(taskSpecStages).set({ state: "failed" }).where(eq(taskSpecStages.stage, "tech_spec"));
    await setup.database.update(taskSpecAttempts).set({ state: "failed" }).where(eq(taskSpecAttempts.id, claim.attemptId));
    const detail = await specCaller(setup).package({ ...specScope(setup), packageId: saved.packageId });
    expect(detail).toMatchObject({ isCurrent: false, approval: null, captureState: "review_ready" });
  });

  it("IT-155 returns source bytes with the captured hash and pages through 101 blocks", async () => {
    const { setup, started } = await harness();
    const [pkg] = await setup.database.insert(taskSpecPackages).values({ workflowId: started.workflowId, stage: "tech_spec", attemptId: started.attemptId, revision: 1, manifestHash: "a".repeat(64), captureState: "review_ready", packageIndex: {} }).returning();
    const text = "# Doc\n";
    const [document] = await setup.database.insert(taskSpecDocuments).values({ packageId: pkg!.id, path: "_techspec.md", role: "techspec", sourceText: text, byteCount: Buffer.byteLength(text), sha256: sha256(text), blocks: Array.from({ length: 101 }, (_, index) => ({ id: `b${index}` })) }).returning();
    const caller = specCaller(setup);
    const input = { ...specScope(setup), packageId: pkg!.id, documentId: document!.id, limit: 100 };
    const first = await caller.document(input);
    expect(first).toMatchObject({ sha256: sha256(text), sourceText: text, totalBlocks: 101 });
    expect(first.blocks).toHaveLength(100);
    const second = await caller.document({ ...input, cursor: first.nextCursor! });
    expect(second.blocks).toEqual([{ id: "b100" }]);
    expect(second.nextCursor).toBeNull();
  });
});
