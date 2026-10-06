import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chmod, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { taskSpecApprovals, taskSpecFinalizations, taskSpecPackages, taskSpecStages } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { crashing, finalizationRoots, harness } from "./spec-finalization-support";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("spec finalization", () => {
  it("promotes a valid prepared package and exposes exactly one review-ready version", async () => {
    const { setup, claim, prepare, finalization, canonical } = await harness();
    const saved = await prepare();
    expect(saved).toMatchObject({ captureState: "prepared", valid: true });
    expect(await finalization().finalize(claim, saved.packageId)).toEqual({ status: "review_ready" });
    expect(await readFile(join(canonical, "_techspec.md"), "utf8")).toContain("TechSpec");
    expect((await setup.database.select().from(taskSpecPackages))[0]).toMatchObject({ captureState: "review_ready" });
    expect((await setup.database.select().from(taskSpecStages)).find((stage) => stage.stage === "tech_spec")).toMatchObject({ state: "review", currentPackageId: saved.packageId });
    expect((await setup.database.select().from(taskSpecFinalizations))[0]).toMatchObject({ phase: "verified" });
    expect(await setup.database.select().from(taskSpecApprovals)).toHaveLength(0);
  });

  it("IT-214 leaves no package or promotion when the prepared transaction cannot commit", async () => {
    const { setup, prepare } = await harness();
    await prepare();
    await expect(prepare({ "_techspec.md": "# TechSpec revisada\n" })).rejects.toThrow();
    expect(await setup.database.select().from(taskSpecPackages)).toHaveLength(1);
    expect(await setup.database.select().from(taskSpecFinalizations)).toHaveLength(1);
  });

  it("IT-215 installs the captured bytes once when the process died before the first rename", async () => {
    const { setup, claim, prepare, finalization, gateway, canonical } = await harness();
    const saved = await prepare();
    await expect(finalization(crashing(gateway, "before")).finalize(claim, saved.packageId)).rejects.toThrow("process died");
    expect(await readFile(join(canonical, "_techspec.md"), "utf8").catch(() => "absent")).toBe("absent");
    expect((await setup.database.select().from(taskSpecPackages))[0]?.captureState).toBe("prepared");
    expect(await finalization().finalize(claim, saved.packageId)).toEqual({ status: "review_ready" });
    expect(await setup.database.select().from(taskSpecFinalizations)).toHaveLength(1);
  });

  it("IT-216 verifies and exposes one review version when the process died after every rename", async () => {
    const { setup, claim, prepare, finalization, gateway } = await harness();
    const saved = await prepare();
    await expect(finalization(crashing(gateway, "after")).finalize(claim, saved.packageId)).rejects.toThrow("process died");
    expect((await setup.database.select().from(taskSpecPackages))[0]?.captureState).toBe("prepared");
    expect(await finalization().finalize(claim, saved.packageId)).toEqual({ status: "review_ready" });
    expect(await setup.database.select().from(taskSpecPackages)).toHaveLength(1);
  });

  it("IT-217 reports capture_failed and keeps the previous canonical package intact when writing fails", async () => {
    const { setup, claim, prepare, finalization, canonical } = await harness();
    const first = await prepare();
    await finalization().finalize(claim, first.packageId);
    const before = await readFile(join(canonical, "_techspec.md"), "utf8");
    await chmod(canonical, 0o555);
    const second = await prepare({ "_techspec.md": `${before}\nmais\n` });
    const outcome = await finalization().finalize(claim, second.packageId);
    await chmod(canonical, 0o755);
    expect(outcome).toEqual({ status: "failed", reason: "capture_failed" });
    expect(await readFile(join(canonical, "_techspec.md"), "utf8")).toBe(before);
    expect((await setup.database.select().from(taskSpecFinalizations)).some((row) => row.phase === "failed" && row.failureReason === "capture_failed")).toBe(true);
  });

  it("IT-220 restores the previous package bytes without creating an approval", async () => {
    const { setup, claim, prepare, finalization, canonical, started } = await harness();
    const first = await prepare();
    await finalization().finalize(claim, first.packageId);
    const v1 = await readFile(join(canonical, "_techspec.md"), "utf8");
    const second = await prepare({ "_techspec.md": `${v1}\nAjuste\n` });
    await finalization().finalize(claim, second.packageId);
    const outcome = await finalization().restore({ taskId: setup.taskId, repositoryGithubId: "202", packageId: first.packageId });
    expect(outcome).toEqual({ status: "review_ready" });
    expect(await readFile(join(canonical, "_techspec.md"), "utf8")).toBe(v1);
    expect(await setup.database.select().from(taskSpecApprovals)).toHaveLength(0);
    expect(started.workflowId).toBeTruthy();
  });
});
