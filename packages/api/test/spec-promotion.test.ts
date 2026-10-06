import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CandidateManifest, ManifestEntry, PromotionJournal, PromotionStep } from "../src/application/spec/specWorkspaceGateway";
import { GitSpecWorkspaceGateway } from "../src/infra/spec/workspace/gitWorkspaceGateway";
import { planCheckout } from "../src/infra/spec/workspace/checkoutPlan";
import { sha256Of } from "../src/infra/spec/workspace/fileHash";

const TASK = "20000000-0000-4000-8000-000000000001";
const attempt = { taskId: TASK, repositoryGithubId: "202", attemptId: "30000000-0000-4000-8000-000000000001", stage: "tech_spec" as const };
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function gateway() {
  const root = await mkdtemp(join(tmpdir(), "spec-promo-"));
  roots.push(root);
  const plan = planCheckout({ root, repositoryGithubId: "202", taskId: TASK });
  await mkdir(plan.canonicalPath, { recursive: true });
  const workspace = new GitSpecWorkspaceGateway({ root, remoteBase: "http://unused", git: async () => ({ stdout: "" }), resolveIdentity: async () => ({ githubId: "202" }), maxCheckoutBytes: 1e9, fetchTimeoutMs: 1000 });
  return { workspace, plan };
}

function manifest(files: Record<string, string>): CandidateManifest {
  const entries: ManifestEntry[] = Object.entries(files).map(([path, content]) => ({ path, role: "doc", sha256: sha256Of(content), bytes: Buffer.byteLength(content) }));
  return { stage: "tech_spec", entries, files: Object.entries(files).map(([path, content]) => ({ path, content })), complete: true, missing: [] };
}

const recorder = (steps: PromotionStep[] = []): PromotionJournal & { steps: PromotionStep[] } => ({ steps, record: async (step) => { steps.push(step); } });

describe("canonical package promotion", () => {
  it("installs changed files atomically, journals each step and verifies the manifest", async () => {
    const { workspace, plan } = await gateway();
    const journal = recorder();
    const candidate = manifest({ "_techspec.md": "# Spec\n", "_tests.md": "# Tests\n" });
    const installed = await workspace.promote({ ...attempt, manifest: candidate, expectedPrior: [], journal });
    expect(installed.entries.map((entry) => entry.path)).toEqual(["_techspec.md", "_tests.md"]);
    expect(await readFile(join(plan.canonicalPath, "_techspec.md"), "utf8")).toBe("# Spec\n");
    expect(journal.steps.map((step) => step.phase)).toEqual(["pending", "installed", "pending", "installed"]);
    expect((await workspace.promote({ ...attempt, manifest: candidate, expectedPrior: [], journal: recorder() })).manifestHash).toBe(installed.manifestHash);
  });

  it("IT-125 refuses to overwrite bytes changed externally after capture", async () => {
    const { workspace, plan } = await gateway();
    const first = manifest({ "_techspec.md": "v1" });
    await workspace.promote({ ...attempt, manifest: first, expectedPrior: [], journal: recorder() });
    await writeFile(join(plan.canonicalPath, "_techspec.md"), "externally edited");
    const failure = await workspace.promote({ ...attempt, manifest: manifest({ "_techspec.md": "v2" }), expectedPrior: first.entries, journal: recorder() }).then(() => null, (error: { reason: string }) => error.reason);
    expect(failure).toBe("artifact_conflict");
    expect(await readFile(join(plan.canonicalPath, "_techspec.md"), "utf8")).toBe("externally edited");
  });

  it("IT-126 finishes idempotently after a crash following the first installed file", async () => {
    const { workspace, plan } = await gateway();
    const candidate = manifest({ "_techspec.md": "# Spec\n", "_tests.md": "# Tests\n" });
    const crashing: PromotionJournal = { record: async (step) => { if (step.phase === "installed") throw new Error("process died"); } };
    await expect(workspace.promote({ ...attempt, manifest: candidate, expectedPrior: [], journal: crashing })).rejects.toThrow("process died");
    expect(await readFile(join(plan.canonicalPath, "_techspec.md"), "utf8")).toBe("# Spec\n");
    expect(await readFile(join(plan.canonicalPath, "_tests.md"), "utf8").catch(() => "absent")).toBe("absent");
    const recovered = await workspace.promote({ ...attempt, manifest: candidate, expectedPrior: [], journal: recorder() });
    expect(recovered.entries).toHaveLength(2);
  });

  it("removes only unchanged task files that left the package and conflicts on edited ones", async () => {
    const { workspace, plan } = await gateway();
    const first = { ...manifest({ "task_01.md": "a", "task_02.md": "b" }), stage: "tasks" as const };
    first.entries.forEach((entry) => { entry.role = "task"; });
    await workspace.promote({ ...attempt, stage: "tasks", manifest: first, expectedPrior: [], journal: recorder() });
    const next = { ...manifest({ "task_01.md": "a" }), stage: "tasks" as const };
    next.entries.forEach((entry) => { entry.role = "task"; });
    await writeFile(join(plan.canonicalPath, "task_02.md"), "edited");
    const failure = await workspace.promote({ ...attempt, stage: "tasks", manifest: next, expectedPrior: first.entries, journal: recorder() }).then(() => null, (error: { reason: string }) => error.reason);
    expect(failure).toBe("artifact_conflict");
  });

  it("IT-069 blocks the next stage when approved upstream bytes differ from their recorded hash", async () => {
    const { workspace, plan } = await gateway();
    const prd = manifest({ "_prd.md": "approved" });
    await workspace.promote({ ...attempt, stage: "prd", manifest: prd, expectedPrior: [], journal: recorder() });
    await writeFile(join(plan.canonicalPath, "_prd.md"), "tampered");
    const failures = await Promise.all([workspace.verify({ taskId: TASK, repositoryGithubId: "202", expected: prd.entries }), workspace.candidate({ ...attempt, upstream: prd.entries, previous: [] })].map((call) => call.then(() => null, (error: { reason: string }) => error.reason)));
    expect(failures).toEqual(["artifact_conflict", "artifact_conflict"]);
  });

  it("IT-079 reports artifact_conflict when a task file changes externally after approval", async () => {
    const { workspace, plan } = await gateway();
    const tasks = { ...manifest({ "task_01.md": "status: pending" }), stage: "tasks" as const };
    await workspace.promote({ ...attempt, stage: "tasks", manifest: tasks, expectedPrior: [], journal: recorder() });
    await writeFile(join(plan.canonicalPath, "task_01.md"), "status: completed");
    const failure = await workspace.verify({ taskId: TASK, repositoryGithubId: "202", expected: tasks.entries }).then(() => null, (error: { reason: string }) => error.reason);
    expect(failure).toBe("artifact_conflict");
  });
});
