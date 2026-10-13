import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it, vi } from "vitest";
import { localPayloadHash } from "../../application/services/local-execution/localHash";
import type { LocalCommand } from "../../application/services/local-execution/localProtocol";
import { LocalCommandJournal } from "./localCommandJournal";
import { LocalNativeCommandAgent } from "./localNativeCommandAgent";
import { PrivateRegistryStore } from "./privateRegistry";

const git = promisify(execFile);
const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

it("opens the issue worktree with nested local environment files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "flow-open-worktree-"));
  directories.push(directory);
  const root = join(directory, "project");
  await mkdir(join(root, "apps", "nextjs"), { recursive: true });
  await git("git", ["init", root]);
  await git("git", ["-C", root, "remote", "add", "origin", "git@github.com:acme/flow.git"]);
  await writeFile(join(root, "README.md"), "project\n");
  await git("git", ["-C", root, "add", "README.md"]);
  await git("git", ["-C", root, "-c", "user.name=Flow", "-c", "user.email=flow@example.test", "commit", "-m", "initial"]);
  await writeFile(join(root, "apps", "nextjs", ".env.local"), "ENV_TEST=local\n");
  const store = new PrivateRegistryStore(join(directory, "registry.json"));
  await store.write({ version: 1, entries: [{ handle: "checkout-handle", key: "a".repeat(64), root, repository: "acme/flow", label: "Flow" }] });
  const taskId = "44444444-4444-4444-8444-444444444444";
  const payload = {};
  const command: LocalCommand = {
    protocolVersion: 1, commandId: taskId, runId: taskId, machineId: "11111111-1111-4111-8111-111111111111",
    projectId: "22222222-2222-4222-8222-222222222222", actorId: "33333333-3333-4333-8333-333333333333",
    fence: 1, leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    target: { machineId: "11111111-1111-4111-8111-111111111111", linkId: "55555555-5555-4555-8555-555555555555", linkRevision: 1, checkoutHandle: "checkout-handle", worktreeTaskId: taskId },
    kind: "open_worktree", payload, payloadHash: localPayloadHash(payload),
  };
  const openWorktree = vi.fn(async (_path: string) => undefined);
  const agent = new LocalNativeCommandAgent({ store, runtimeRoot: join(directory, "runtime"), openWorktree });
  const [event] = await agent.handle(command, new LocalCommandJournal(join(directory, "journal.json")));
  expect(event).toMatchObject({ kind: "terminal", payload: { outcome: "succeeded" } });
  expect(openWorktree).toHaveBeenCalledOnce();
  const path = openWorktree.mock.calls[0]![0];
  expect(path).not.toBe(root);
  expect(await readFile(join(path, "apps", "nextjs", ".env.local"), "utf8")).toBe("ENV_TEST=local\n");
  expect(JSON.stringify(event)).not.toContain(path);
});
