import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { LocalCommand } from "../../application/services/local-execution/localProtocol";
import { installApprovedSpecFiles } from "./localLoopTaskFiles";
import { assertNoArtifactConflict } from "./localRunArtifacts";
import { cleanRunDocuments } from "./localRunCleanup";

const APPROVED_SPEC = [{ path: "_spec.md", content: "# Spec" }, { path: "_tests.md", content: "# Tests" }];
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

async function makeCheckout() {
  const directory = await mkdtemp(join(tmpdir(), "flow-run-cleanup-"));
  dirs.push(directory);
  const root = join(directory, "checkout");
  await mkdir(join(root, ".flow-spec"), { recursive: true });
  return { root, runtimeRoot: join(directory, "runtime") };
}

function startCommand(kind: string, taskFiles = APPROVED_SPEC) {
  return { kind: "start", runId: "run-1", payload: { snapshot: { kind }, taskFiles } } as unknown as LocalCommand;
}

describe("documents left in the shared spec folder when a run ends", () => {
  it("lets another task create its spec after a failed task breakdown", async () => {
    const { root, runtimeRoot } = await makeCheckout();
    await installApprovedSpecFiles({ root, files: APPROVED_SPEC });
    await writeFile(join(root, ".flow-spec", "_tasks.md"), "# Tasks");
    await cleanRunDocuments({ root, runtimeRoot, command: startCommand("create_tasks") });
    expect(await readdir(join(root, ".flow-spec"))).toEqual([]);
    await expect(assertNoArtifactConflict(root, "create_spec")).resolves.toBeUndefined();
  });

  it("lets another task create its spec after a successful spec run", async () => {
    const { root, runtimeRoot } = await makeCheckout();
    await writeFile(join(root, ".flow-spec", "_spec.md"), "# Spec");
    await cleanRunDocuments({ root, runtimeRoot, command: startCommand("create_spec", []), collectedPaths: ["_spec.md"] });
    await expect(assertNoArtifactConflict(root, "create_spec")).resolves.toBeUndefined();
  });

  it("keeps the spec documents of the checkout when an implementation run ends", async () => {
    const { root, runtimeRoot } = await makeCheckout();
    await installApprovedSpecFiles({ root, files: APPROVED_SPEC });
    await cleanRunDocuments({ root, runtimeRoot, command: startCommand("loop") });
    expect((await readdir(join(root, ".flow-spec"))).sort()).toEqual(["_spec.md", "_tests.md"]);
  });
});
