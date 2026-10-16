import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { FLOW_BASE_CONFIG_KEY, localTaskWorktree } from "./localTaskWorktree";
import { localCheckoutScope } from "../../application/services/local-execution/localCheckoutScope";

const git = promisify(execFile);
const directories: string[] = [];
const FIRST_TASK = "11111111-1111-4111-8111-111111111111";
const SECOND_TASK = "22222222-2222-4222-8222-222222222222";
const target = { machineId: "machine", linkId: "link", linkRevision: 1, checkoutHandle: "checkout", worktreeTaskId: FIRST_TASK };

afterEach(async () => { await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

async function repository() {
  const root = await mkdtemp(join(tmpdir(), "flow-task-worktree-"));
  const runtimeRoot = await mkdtemp(join(tmpdir(), "flow-task-runtime-"));
  directories.push(root, runtimeRoot);
  await git("git", ["init", root]);
  await writeFile(join(root, "README.md"), "committed\n");
  await git("git", ["-C", root, "add", "."]);
  await git("git", ["-C", root, "-c", "user.name=Flow", "-c", "user.email=flow@example.test", "commit", "-m", "initial"]);
  return { root, runtimeRoot, target };
}

describe("local issue worktree", () => {
  it("records the branch the issue branch was created from for publication", async () => {
    const input = await repository();
    await git("git", ["-C", input.root, "checkout", "-q", "-b", "development"]);
    await localTaskWorktree({ ...input, create: true });
    const recorded = await git("git", ["-C", input.root, "config", "--get", `branch.flow/issue-${FIRST_TASK}.${FLOW_BASE_CONFIG_KEY}`]);
    expect(recorded.stdout.trim()).toBe("development");
  });

  it("creates separate worktrees from the current local project state", async () => {
    const input = await repository();
    await writeFile(join(input.root, "README.md"), "local changes\n");
    const [first, second] = await Promise.all([
      localTaskWorktree({ ...input, create: true }),
      localTaskWorktree({ ...input, target: { ...target, worktreeTaskId: SECOND_TASK }, create: true }),
    ]);
    expect(first).not.toBe(second);
    expect(await readFile(join(first, "README.md"), "utf8")).toBe("local changes\n");
    expect(await readFile(join(input.root, "README.md"), "utf8")).toBe("local changes\n");
    await writeFile(join(first, "README.md"), "issue progress\n");
    expect(await readFile(join(second, "README.md"), "utf8")).toBe("local changes\n");
  });

  it("reuses the same worktree under concurrent preparations and preserves progress", async () => {
    const input = await repository();
    const roots = await Promise.all([localTaskWorktree({ ...input, create: true }), localTaskWorktree({ ...input, create: true })]);
    expect(roots[0]).toBe(roots[1]);
    await writeFile(join(roots[0]!, "README.md"), "progress\n");
    expect(await localTaskWorktree(input)).toBe(roots[0]);
    expect(await localTaskWorktree({ ...input, create: true })).toBe(roots[0]);
    expect(await readFile(join(roots[0]!, "README.md"), "utf8")).toBe("progress\n");
  });

  it("restores a missing local environment file without replacing a worktree override", async () => {
    const input = await repository();
    const nested = join("apps", "nextjs", ".env.local");
    await mkdir(join(input.root, "apps", "nextjs"), { recursive: true });
    await writeFile(join(input.root, ".env"), "TOKEN=local\n");
    await writeFile(join(input.root, nested), "NEXT_PUBLIC_SITE=local\n");
    const path = await localTaskWorktree({ ...input, create: true });
    expect((await stat(join(path, ".env"))).mode & 0o777).toBe(0o600);
    expect((await stat(join(path, nested))).mode & 0o777).toBe(0o600);
    await rm(join(path, ".env"));
    await rm(join(path, nested));
    await localTaskWorktree({ ...input, create: true });
    expect(await readFile(join(path, ".env"), "utf8")).toBe("TOKEN=local\n");
    expect((await stat(join(path, ".env"))).mode & 0o777).toBe(0o600);
    expect(await readFile(join(path, nested), "utf8")).toBe("NEXT_PUBLIC_SITE=local\n");
    expect((await stat(join(path, nested))).mode & 0o777).toBe(0o600);
    await writeFile(join(path, ".env"), "TOKEN=worktree\n");
    await writeFile(join(path, nested), "NEXT_PUBLIC_SITE=worktree\n");
    await localTaskWorktree({ ...input, create: true });
    expect(await readFile(join(path, ".env"), "utf8")).toBe("TOKEN=worktree\n");
    expect(await readFile(join(path, nested), "utf8")).toBe("NEXT_PUBLIC_SITE=worktree\n");
  });

  it("refuses missing or substituted worktrees on start", async () => {
    const input = await repository();
    await expect(localTaskWorktree(input)).rejects.toMatchObject({ reason: "path_invalid" });
    const path = await localTaskWorktree({ ...input, create: true });
    await git("git", ["-C", input.root, "worktree", "remove", path]);
    await symlink(input.root, path);
    await expect(localTaskWorktree(input)).rejects.toMatchObject({ reason: "path_invalid" });
  });

  it("keeps legacy commands on their original checkout and scopes new locks per issue", async () => {
    const input = await repository();
    const legacy = { ...target, worktreeTaskId: undefined };
    expect(await localTaskWorktree({ ...input, target: legacy })).toBe(input.root);
    expect(localCheckoutScope(legacy)).toBe(target.checkoutHandle);
    expect(localCheckoutScope(target)).not.toBe(localCheckoutScope({ ...target, worktreeTaskId: SECOND_TASK }));
  });
});
