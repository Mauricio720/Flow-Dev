import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertNoArtifactConflict, discardRunArtifacts } from "./localRunArtifacts";

const RUN_ID = "run-1";
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

async function makeCheckout(files: string[]) {
  const directory = await mkdtemp(join(tmpdir(), "flow-run-artifacts-"));
  dirs.push(directory);
  const root = join(directory, "checkout");
  await mkdir(join(root, ".flow-spec"), { recursive: true });
  for (const name of files) await writeFile(join(root, ".flow-spec", name), `content of ${name}`);
  return { root, runtimeRoot: join(directory, "runtime") };
}

describe("local run artifacts", () => {
  it("blocks a tasks run while task files are present and allows it once they are discarded", async () => {
    const { root, runtimeRoot } = await makeCheckout(["_spec.md", "_tasks.md", "task_01.md"]);
    await expect(assertNoArtifactConflict(root, "create_tasks")).rejects.toMatchObject({ reason: "artifact_conflict" });
    await discardRunArtifacts({ root, kind: "create_tasks", runtimeRoot, runId: RUN_ID });
    await expect(assertNoArtifactConflict(root, "create_tasks")).resolves.toBeUndefined();
  });

  it("keeps the documents of other actions and preserves a copy of what it removed", async () => {
    const { root, runtimeRoot } = await makeCheckout(["_spec.md", "_inventory.md", "_tasks.md", "task_01.md"]);
    await discardRunArtifacts({ root, kind: "create_tasks", runtimeRoot, runId: RUN_ID });
    expect((await readdir(join(root, ".flow-spec"))).sort()).toEqual(["_inventory.md", "_spec.md"]);
    const preserved = join(runtimeRoot, "runs", RUN_ID, "discarded-artifacts");
    expect((await readdir(preserved)).sort()).toEqual(["_tasks.md", "task_01.md"]);
    expect(await readFile(join(preserved, "task_01.md"), "utf8")).toBe("content of task_01.md");
  });

  it("discards spec documents for a spec run without touching task files", async () => {
    const { root, runtimeRoot } = await makeCheckout(["_spec.md", "_tests.md", "_tasks.md"]);
    await discardRunArtifacts({ root, kind: "create_spec", runtimeRoot, runId: RUN_ID });
    expect(await readdir(join(root, ".flow-spec"))).toEqual(["_tasks.md"]);
  });

  it("leaves the checkout alone for actions that produce no package", async () => {
    const { root, runtimeRoot } = await makeCheckout(["_tasks.md"]);
    await discardRunArtifacts({ root, kind: "implementation", runtimeRoot, runId: RUN_ID });
    expect(await readdir(join(root, ".flow-spec"))).toEqual(["_tasks.md"]);
  });

  it("removes the documents a successful run collected, including the ones outside the required set", async () => {
    const { root, runtimeRoot } = await makeCheckout(["_spec.md", "_inventory.md", "local-gates.json"]);
    await mkdir(join(root, ".flow-spec", "adrs"));
    await writeFile(join(root, ".flow-spec", "adrs", "adr-001.md"), "decision");
    await discardRunArtifacts({ root, kind: "create_spec", runtimeRoot, runId: RUN_ID, collectedPaths: ["_spec.md", "_inventory.md", "adrs/adr-001.md"] });
    expect((await readdir(join(root, ".flow-spec"))).sort()).toEqual(["adrs", "local-gates.json"]);
    expect(await readdir(join(root, ".flow-spec", "adrs"))).toEqual([]);
    expect(await readFile(join(runtimeRoot, "runs", RUN_ID, "discarded-artifacts", "adrs", "adr-001.md"), "utf8")).toBe("decision");
  });
});
