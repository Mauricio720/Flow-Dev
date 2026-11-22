import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ExecGitCheckoutInspector } from "../src/infra/terminal/execGitCheckoutInspector";

const created: string[] = [];
const inspector = new ExecGitCheckoutInspector();

afterEach(async () => {
  await Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function git(directory: string, ...args: string[]) {
  return execFileSync("git", ["-c", "user.email=t@t.invalid", "-c", "user.name=t", ...args], { cwd: directory, encoding: "utf8" }).trim();
}

async function repository(name = "shop") {
  const base = await mkdtemp(join(tmpdir(), "inspector-"));
  created.push(base);
  const root = join(base, "Área de trabalho", name);
  await mkdir(root, { recursive: true });
  git(root, "init", "-q", "-b", "main");
  await writeFile(join(root, "README.md"), "x");
  git(root, "add", ".");
  git(root, "commit", "-q", "-m", "init");
  return root;
}

describe("ExecGitCheckoutInspector", () => {
  it("V-01d reports a missing folder and a folder without git", async () => {
    expect(await inspector.inspect("/nonexistent/flow-dev-folder")).toEqual({ kind: "missing" });
    const base = await mkdtemp(join(tmpdir(), "plain-"));
    created.push(base);
    expect(await inspector.inspect(base)).toEqual({ kind: "not_repository" });
  });

  it("V-01e reports the root when the path is a subfolder", async () => {
    const root = await repository();
    await mkdir(join(root, "src", "deep"), { recursive: true });
    expect(await inspector.inspect(join(root, "src", "deep"))).toEqual({ kind: "subfolder", root });
  });

  it("V-01l reads a repository whose path has a space and an accent", async () => {
    const root = await repository();
    git(root, "remote", "add", "origin", "git@github.com:acme/shop.git");
    git(root, "remote", "add", "upstream", "https://github.com/acme/shop");
    const result = await inspector.inspect(root);
    expect(result).toMatchObject({ kind: "repository", root, branch: "main", detachedSha: null, dirty: false });
    expect(result.kind === "repository" && result.remotes.sort()).toEqual(["git@github.com:acme/shop.git", "https://github.com/acme/shop"]);
  });

  it("reports a detached HEAD with the 7 character sha", async () => {
    const root = await repository();
    git(root, "checkout", "-q", "--detach");
    const result = await inspector.inspect(root);
    expect(result).toMatchObject({ kind: "repository", branch: null, detachedSha: git(root, "rev-parse", "--short=7", "HEAD") });
  });

  it("counts a modified file and a new file as dirty", async () => {
    const root = await repository();
    await writeFile(join(root, "README.md"), "changed");
    expect(await inspector.inspect(root)).toMatchObject({ dirty: true });
    git(root, "checkout", "--", "README.md");
    await writeFile(join(root, "novo.txt"), "n");
    expect(await inspector.inspect(root)).toMatchObject({ dirty: true });
  });
});
