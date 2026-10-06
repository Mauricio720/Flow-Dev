import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { closeTaskFixture } from "./task-api-support";
import { finalizationRoots, harness } from "./spec-finalization-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("return to review", () => {
  it("IT-221 preserves externally edited bytes and reports artifact_conflict when restoring", async () => {
    const { setup, claim, prepare, finalization, canonical } = await harness();
    const first = await prepare();
    await finalization().finalize(claim, first.packageId);
    const original = await readFile(join(canonical, "_techspec.md"), "utf8");
    const second = await prepare({ "_techspec.md": `${original}\nAjuste\n` });
    await finalization().finalize(claim, second.packageId);
    await writeFile(join(canonical, "_techspec.md"), "edição externa");
    const outcome = await finalization().restore({ taskId: setup.taskId, repositoryGithubId: "202", packageId: first.packageId });
    expect(outcome).toEqual({ status: "failed", reason: "artifact_conflict" });
    expect(await readFile(join(canonical, "_techspec.md"), "utf8")).toBe("edição externa");
  });
});
