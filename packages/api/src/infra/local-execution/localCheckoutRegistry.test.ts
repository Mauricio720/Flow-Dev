import { execFile } from "node:child_process";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { LocalCheckoutRegistry } from "./localCheckoutRegistry";
import { PrivateRegistryStore } from "./privateRegistry";

const run = promisify(execFile);
const roots: string[] = [];

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("LocalCheckoutRegistry", () => {
  it("UT-052 rejects an existing directory without a Git root", async () => {
    const root = await temp();
    await expect(registry(root).link({ path: root, expectedRepository: "acme/flow", label: "Laptop" })).rejects.toMatchObject({ reason: "not_git_root" });
  });

  it("UT-054 rejects paths over 4096 UTF-8 bytes", async () => {
    const root = await temp();
    await expect(registry(root).link({ path: `/${"a".repeat(4096)}`, expectedRepository: "acme/flow", label: "Laptop" })).rejects.toMatchObject({ reason: "path_limit" });
  });

  it("UT-111 gives HTTPS and SSH aliases one canonical opaque handle", async () => {
    const root = await repository("https://github.com/acme/flow.git");
    const alias = `${root}-alias`;
    await symlink(root, alias);
    const checkout = registry(root);
    const first = await checkout.link({ path: root, expectedRepository: "acme/flow", label: "Laptop" });
    const second = await checkout.link({ path: alias, expectedRepository: "acme/flow", label: "Laptop" });
    expect(first.handle).toBe(second.handle);
    expect(first.key).toBe(second.key);
    expect(await checkout.rootFor(first.handle, first.key)).toBe(root);
    await expect(checkout.rootFor(first.handle, "0".repeat(64))).rejects.toMatchObject({ reason: "path_not_allowed" });
    expect(first).not.toHaveProperty("root");
  });

  it("UT-112 rejects a symlink outside approved roots", async () => {
    const allowed = await temp();
    const outside = await repository("git@github.com:acme/flow.git");
    await symlink(outside, join(allowed, "external"));
    await expect(registry(allowed).link({ path: join(allowed, "external"), expectedRepository: "acme/flow", label: "Laptop" })).rejects.toMatchObject({ reason: "path_not_allowed" });
  });

  it("UT-113 rejects credential-bearing repository remotes", async () => {
    const root = await repository("https://user:secret@github.com/acme/flow.git");
    await expect(registry(root).link({ path: root, expectedRepository: "acme/flow", label: "Laptop" })).rejects.toMatchObject({ reason: "repository_mismatch" });
  });
});

function registry(root: string) { return new LocalCheckoutRegistry(new PrivateRegistryStore(join(root, ".registry.json")), [root]); }
async function temp() { const root = await mkdtemp(join(tmpdir(), "flow-local-")); roots.push(root); return root; }
async function repository(remote: string) {
  const root = await temp();
  await run("git", ["init", root]);
  await run("git", ["-C", root, "remote", "add", "origin", remote]);
  await writeFile(join(root, "README.md"), "checkout");
  return root;
}
