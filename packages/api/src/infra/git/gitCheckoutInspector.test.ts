import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createGitRepository, temporaryDirectory } from "../../../test/git-repository-support";
import { GitCheckoutInspector } from "./gitCheckoutInspector";

const REMOTE = "git@github.com:Acme/Meu-App.git";
const inspector = new GitCheckoutInspector();
let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => { await cleanup?.(); cleanup = undefined; });

async function workspace() {
  const temporary = await temporaryDirectory();
  cleanup = temporary.remove;
  return temporary.directory;
}

describe("GitCheckoutInspector with real repositories", () => {
  it("UT-002 reports a missing directory as checkout_not_found", async () => {
    const root = await workspace();
    await expect(inspector.inspect(join(root, "missing"))).rejects.toMatchObject({ reason: "checkout_not_found" });
  });

  it("UT-003 rejects a subdirectory of a repository", async () => {
    const repository = await createGitRepository(join(await workspace(), "app"), { remote: REMOTE });
    const nested = join(repository, "src");
    await mkdir(nested);
    await expect(inspector.inspect(nested)).rejects.toMatchObject({ reason: "checkout_not_git_root" });
  });

  it("UT-003 rejects a directory outside any repository", async () => {
    const plain = join(await workspace(), "plain");
    await mkdir(plain);
    await expect(inspector.inspect(plain)).rejects.toMatchObject({ reason: "checkout_not_git_root" });
  });

  it("UT-005 inspects a clone whose path has accents and spaces", async () => {
    const repository = await createGitRepository(join(await workspace(), "x", "Área de trabalho", "app"), { remote: REMOTE });
    await expect(inspector.inspect(repository)).resolves.toEqual({ root: repository, remotes: [REMOTE], defaultBranch: "main" });
  });

  it("returns no default branch when origin/HEAD is missing", async () => {
    const repository = await createGitRepository(join(await workspace(), "app"), { remote: REMOTE, originHead: false });
    await expect(inspector.inspect(repository)).resolves.toMatchObject({ defaultBranch: null });
  });
});
