import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { HookPayload, RuntimeExit, RuntimeHandlers } from "../../application/terminal/agentSessionRuntime";
import { ScriptedSessionRuntime } from "./scriptedSessionRuntime";

const folders: string[] = [];
afterEach(async () => {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function scene() {
  const root = await mkdtemp(join(tmpdir(), "script-file-"));
  folders.push(root);
  const clone = join(root, "clone");
  const hooks: HookPayload[] = [];
  const exits: RuntimeExit[] = [];
  const handlers: RuntimeHandlers = { onAssistantText: () => undefined, onHook: (payload) => hooks.push(payload), onPermission: async () => ({ behavior: "allow" }), onExit: (outcome) => exits.push(outcome) };
  return { root, clone, hooks, exits, handlers };
}

const startWith = (runtime: ScriptedSessionRuntime, context: Awaited<ReturnType<typeof scene>>) => runtime.start({ sessionId: "s1", cwd: context.clone, prompt: "oi", contextDir: join(context.root, "ctx"), permissionMode: "bypass", handlers: context.handlers });

describe("scripted write_file step", () => {
  it("V-38f writes the file inside the clone and delivers a PostToolUse Write hook with its absolute path", async () => {
    const context = await scene();
    const content = "---\nstatus: pending\n---\n";
    const runtime = new ScriptedSessionRuntime({ script: [{ kind: "write_file", path: "docs/specs/login/task_01.md", content }] });
    await startWith(runtime, context).settled();
    const target = join(context.clone, "docs/specs/login/task_01.md");
    expect(await readFile(target, "utf8")).toBe(content);
    const write = context.hooks.find((hook) => hook.hook_event_name === "PostToolUse");
    expect(write).toMatchObject({ tool_name: "Write", tool_input: { file_path: target, content }, cwd: context.clone });
    expect(context.exits).toEqual([]);
  });

  it("V-38f refuses a path outside the clone without writing, and ends the session as failed", async () => {
    const context = await scene();
    const runtime = new ScriptedSessionRuntime({ script: [{ kind: "write_file", path: "../fora.md", content: "x" }, { kind: "write_file", path: "depois.md", content: "y" }] });
    await startWith(runtime, context).settled();
    await expect(stat(join(context.root, "fora.md"))).rejects.toThrow();
    await expect(stat(join(context.clone, "depois.md"))).rejects.toThrow();
    expect(context.exits).toEqual([{ kind: "failed", detail: "O roteiro tentou gravar fora do clone: ../fora.md" }]);
    expect(context.hooks.some((hook) => hook.hook_event_name === "PostToolUse")).toBe(false);
  });

  it("V-38f refuses an absolute path outside the clone", async () => {
    const context = await scene();
    const outside = join(context.root, "absoluto.md");
    const runtime = new ScriptedSessionRuntime({ script: [{ kind: "write_file", path: outside, content: "x" }] });
    await startWith(runtime, context).settled();
    await expect(stat(outside)).rejects.toThrow();
    expect(context.exits).toHaveLength(1);
  });
});
