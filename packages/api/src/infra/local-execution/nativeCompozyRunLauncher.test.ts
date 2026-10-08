import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecutionRequest } from "../../application/services/task-flow/actionExecutor";
import { NativeCompozyRunLauncher } from "./nativeCompozyRunLauncher";
import { PrivateRegistryStore } from "./privateRegistry";

const run = promisify(execFile);
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("NativeCompozyRunLauncher", () => {
  it("UT-129 launches the pinned daemon in the canonical linked checkout with private run resources", async () => {
    const root = await mkdtemp(join(tmpdir(), "flow-native-run-"));
    roots.push(root);
    const checkout = join(root, "checkout");
    await mkdir(checkout);
    await run("git", ["init", checkout]);
    await run("git", ["-C", checkout, "remote", "add", "origin", "git@github.com:acme/flow.git"]);
    const registry = new PrivateRegistryStore(join(root, "registry.json"));
    await registry.write({ version: 1, entries: [{ handle: "checkout-handle", key: "a".repeat(64), root: checkout, repository: "acme/flow", label: "Flow checkout" }] });
    const runtimeRoot = join(root, "private-runtime");
    const child = new EventEmitter() as ChildProcess;
    Object.assign(child, { pid: 987654321, exitCode: null, signalCode: null, unref: vi.fn() });
    const spawnProcess = vi.fn(() => {
      queueMicrotask(() => child.emit("spawn"));
      return child;
    });
    const launcher = new NativeCompozyRunLauncher({
      registry, runtimeRoot, resourcesRoot: join(process.cwd(), "runtime"), skillsRoot: join(process.cwd(), "resources/spec"),
      environment: { PATH: "/usr/bin" }, spawnProcess: spawnProcess as never,
      onSpawn: () => { void mkdir(join(runtimeRoot, "runs", "run-1", "socket"), { recursive: true }).then(() => writeFile(join(runtimeRoot, "runs", "run-1", "socket", "daemon.sock"), "")); },
    });
    const request = {
      run: { id: "run-1" },
      snapshot: { kind: "create_spec", runtime: { connectionId: "c1", providerId: "codex", modelId: "model-1", reasoningEffort: null }, runtimeProviderIds: { c1: "codex-local" }, workspace: { kind: "local", target: { machineId: "machine-1", linkId: "link-1", linkRevision: 1, checkoutHandle: "checkout-handle" } } },
    } as unknown as ExecutionRequest;

    await expect(launcher.start(request)).resolves.toEqual({ socketPath: join(runtimeRoot, "runs", "run-1", "socket", "daemon.sock") });
    expect(spawnProcess).toHaveBeenCalledWith("compozy", ["daemon", "start", "--foreground"], expect.objectContaining({ cwd: checkout, detached: true }));
    const config = await readFile(join(runtimeRoot, "runs", "run-1", "home", ".compozy", "config.toml"), "utf8");
    expect(config).toContain('[providers.codex-local]');
    expect(config).toContain("socket =");
    expect(await readFile(join(runtimeRoot, "runs", "run-1", "home", ".compozy", "agents/flow-spec/AGENT.md"), "utf8")).toContain("Load the skill");
    expect((await readFile(join(runtimeRoot, "runs", "run-1", "home", ".compozy", "skills/flow-spec-prd/SKILL.md"), "utf8")).length).toBeGreaterThan(0);
  });
});
