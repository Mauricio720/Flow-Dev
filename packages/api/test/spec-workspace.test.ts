import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GitSpecWorkspaceGateway } from "../src/infra/spec/workspace/gitWorkspaceGateway";
import { createGitRunner, type SpawnRecord } from "../src/infra/spec/workspace/gitRunner";
import { planCheckout } from "../src/infra/spec/workspace/checkoutPlan";
import { buildAgentSnapshot } from "../src/infra/spec/workspace/agentSnapshot";
import { createRemote, GIT_TOKEN } from "./spec-git-server";
const TASK = "20000000-0000-4000-8000-000000000001";
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { await Promise.all(cleanups.splice(0).map((cleanup) => cleanup())); });

async function setup(identity = "202", maxCheckoutBytes = 5 * 1024 ** 3) {
  const remote = await createRemote({ "README.md": "# Projeto\n", "src/index.ts": "export {};\n", ".env": "SECRET=1\n", "config/credentials.json": "{}" });
  const root = await mkdtemp(join(tmpdir(), "spec-root-"));
  const records: SpawnRecord[] = [];
  const gateway = new GitSpecWorkspaceGateway({ root, remoteBase: remote.baseUrl, git: createGitRunner((record) => records.push(record)), resolveIdentity: async () => ({ githubId: identity }), maxCheckoutBytes, fetchTimeoutMs: 20_000 });
  cleanups.push(remote.close, () => rm(root, { recursive: true, force: true }));
  return { gateway, remote, root, records };
}

const input = (pinnedCommit: string | null = null, password = GIT_TOKEN) => ({ taskId: TASK, repositoryGithubId: "202", owner: "acme", name: "private", pinnedCommit, credential: { username: "x-access-token", password } });
const reason = (promise: Promise<unknown>) => promise.then(() => null, (error: { reason?: string }) => error.reason);

describe("checkout provisioning", () => {
  it("UT-019 maps a verified repository to a deterministic task checkout plan", () => {
    const plan = planCheckout({ root: "/srv/spec", repositoryGithubId: "202", taskId: TASK });
    expect(plan).toMatchObject({ slug: `flow-${TASK}`, checkoutPath: `/srv/spec/202/${TASK}/checkout`, canonicalPath: `/srv/spec/202/${TASK}/checkout/.compozy/tasks/flow-${TASK}` });
    expect(() => planCheckout({ root: "/srv/spec", repositoryGithubId: "../x", taskId: TASK })).toThrow(expect.objectContaining({ reason: "workspace_unavailable" }));
  });
  it("UT-020 and IT-019 reject a different remote identity before any git process starts", async () => {
    const { gateway, records } = await setup("999");
    expect(await reason(gateway.prepare(input()))).toBe("workspace_unavailable");
    expect(records).toHaveLength(0);
  });
  it("IT-232 provisions a private repository without exposing the credential anywhere observable", async () => {
    const { gateway, remote, records } = await setup();
    const workspace = await gateway.prepare(input());
    expect(workspace.baseCommit).toBe(remote.commit);
    expect(await readFile(join(workspace.checkoutPath, "README.md"), "utf8")).toBe("# Projeto\n");
    expect(JSON.stringify(records)).not.toContain(GIT_TOKEN);
    expect(await readFile(join(workspace.checkoutPath, ".git", "config"), "utf8")).not.toContain(GIT_TOKEN);
    expect(records.every((record) => record.args.every((arg) => !arg.includes("@127.0.0.1")))).toBe(true);
  });
  it("fails closed with a wrong credential, an unmanaged path and an oversized checkout", async () => {
    const wrong = await setup();
    expect(await reason(wrong.gateway.prepare(input(null, "wrong")))).toBe("workspace_unavailable");
    const unmanaged = await setup();
    await mkdir(join(unmanaged.root, "202", TASK, "checkout"), { recursive: true });
    expect(await reason(unmanaged.gateway.prepare(input()))).toBe("workspace_unavailable");
    const large = await setup("202", 10);
    expect(await reason(large.gateway.prepare(input()))).toBe("resource_limit");
  });
  it("reuses a managed checkout and refuses a different pinned commit", async () => {
    const { gateway, remote } = await setup();
    await gateway.prepare(input());
    expect((await gateway.prepare(input(remote.commit))).baseCommit).toBe(remote.commit);
    expect(await reason(gateway.prepare(input("a".repeat(40))))).toBe("workspace_unavailable");
  });
  it("keeps secrets and Git metadata out of the agent-visible snapshot", async () => {
    const { gateway, root } = await setup();
    const workspace = await gateway.prepare(input());
    const target = join(root, "snapshot");
    const count = await buildAgentSnapshot({ git: createGitRunner(), checkoutPath: workspace.checkoutPath, target });
    expect(count).toBe(2);
    expect(await readFile(join(target, "src/index.ts"), "utf8")).toBe("export {};\n");
    expect(await readFile(join(target, ".env"), "utf8").catch(() => "missing")).toBe("missing");
  });
});

describe("candidate freezing", () => {
  const attempt = { taskId: TASK, repositoryGithubId: "202", attemptId: "30000000-0000-4000-8000-000000000001", stage: "tech_spec" as const };
  async function candidate() {
    const { gateway, root } = await setup();
    await gateway.prepare(input());
    const paths = await gateway.candidate({ ...attempt, upstream: [], previous: [] });
    return { gateway, root, paths };
  }

  it("freezes only current stage outputs and reports missing companions", async () => {
    const { gateway, paths } = await candidate();
    await writeFile(join(paths.candidatePath, "_techspec.md"), "# Spec\n");
    const partial = await gateway.freeze(attempt);
    expect(partial).toMatchObject({ complete: false, missing: ["_tests.md", ".flow-spec-tech_spec.json"] });
    await writeFile(join(paths.candidatePath, "_tests.md"), "# Tests\n");
    await writeFile(join(paths.candidatePath, ".flow-spec-tech_spec.json"), "{}");
    expect(await gateway.freeze(attempt)).toMatchObject({ complete: true, missing: [], entries: [expect.objectContaining({ path: ".flow-spec-tech_spec.json" }), expect.objectContaining({ path: "_techspec.md" }), expect.objectContaining({ path: "_tests.md" })] });
  });
  it("IT-121 rejects traversal-like names, outside symlinks and unexpected output without copying them", async () => {
    const { gateway, paths, root } = await candidate();
    await writeFile(join(root, "outside.md"), "secret");
    await symlink(join(root, "outside.md"), join(paths.candidatePath, "_tests.md"));
    expect(await reason(gateway.freeze(attempt))).toBe("artifact_invalid");
    await rm(join(paths.candidatePath, "_tests.md"));
    await mkdir(join(paths.candidatePath, "src"), { recursive: true });
    await writeFile(join(paths.candidatePath, "src/index.ts"), "x");
    expect(await reason(gateway.freeze(attempt))).toBe("artifact_invalid");
  });
});
