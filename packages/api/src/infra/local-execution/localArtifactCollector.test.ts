import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectLocalArtifacts } from "./localArtifactCollector";

let root = "";
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

async function checkout(files: Record<string, string>) {
  root = await mkdtemp(join(tmpdir(), "flow-artifacts-"));
  await mkdir(join(root, ".flow-spec", "adrs"), { recursive: true });
  for (const [path, content] of Object.entries(files)) await writeFile(join(root, ".flow-spec", path), content);
  return root;
}

describe("collectLocalArtifacts", () => {
  it("collects the spec documents and ADRs, leaving task files and other files out", async () => {
    await checkout({ "_spec.md": "# Spec", "_tests.md": "# Tests", "adrs/adr-001.md": "# ADR", "task_01.md": "# Task", "notes.txt": "ignored", "_inventory.md": "# Working notes" });
    const files = await collectLocalArtifacts(root, "create_spec");
    expect(files?.map((file) => file.path).sort()).toEqual(["_spec.md", "_tests.md", "adrs/adr-001.md"]);
    expect((await collectLocalArtifacts(root, "create_tasks"))?.map((file) => file.path)).toEqual(["task_01.md"]);
  });

  it("does not follow symbolic links out of the package directory", async () => {
    await checkout({ "_spec.md": "# Spec" });
    await writeFile(join(root, "outside.md"), "private");
    await symlink(join(root, "outside.md"), join(root, ".flow-spec", "linked.md"));
    expect((await collectLocalArtifacts(root, "create_spec"))?.map((file) => file.path)).toEqual(["_spec.md"]);
  });

  it("refuses the whole package when a document carries a credential", async () => {
    await checkout({ "_spec.md": "# Spec", "_dx.md": `key sk-${"a".repeat(30)}` });
    expect(await collectLocalArtifacts(root, "create_spec")).toBeNull();
  });

  it("sends nothing for actions that do not produce a package", async () => {
    await checkout({ "_spec.md": "# Spec" });
    expect(await collectLocalArtifacts(root, "loop")).toEqual([]);
  });
});
