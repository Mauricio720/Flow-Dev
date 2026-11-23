import { afterEach, describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { taskArtifactVersions, taskArtifacts } from "../src/infra/database/schema";
import { requestsOf, sessionRowOf } from "./session-interaction-support";
import { brokerWorld, cycle, messagesOf, scopeOf, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const QUESTION = [{ question: "Qual?", header: "Q", multiSelect: false, options: [{ label: "A", description: "a" }, { label: "B", description: "b" }] }];
const SPEC_PATH = "docs/specs/x/spec.md";


describe("session controls", () => {
  it("V-25a stops the turn, cancels the pending request and denies it, notes the interruption and goes to waiting", async () => {
    const world = await brokerWorld([{ kind: "ask", questions: QUESTION }]);
    const id = await world.open();
    await cycle(world);
    await world.harness.caller.session.interrupt(scopeOf(world, id));
    await cycle(world);
    const runner = world.runtime.runnerOf(id);
    expect(runner.interrupts).toBe(1);
    expect(runner.outcomes).toEqual([{ behavior: "deny", message: "Interrompido pela pessoa" }]);
    expect((await requestsOf(world.setup, id)).map((request) => request.status)).toEqual(["cancelled"]);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "waiting", interruptRequestedAt: null });
    expect((await messagesOf(world, id)).filter((message) => message.role === "system").map((message) => message.content)).toEqual(["Interrompido por você"]);
  });

  it("V-25b ignores an interrupt on a session that is already waiting, clears the flag and shows no note (B-30)", async () => {
    const world = await brokerWorld([{ kind: "end_turn" }]);
    const id = await world.open();
    await cycle(world);
    expect((await sessionRowOf(world.setup, id)).status).toBe("waiting");
    await world.harness.caller.session.interrupt(scopeOf(world, id));
    await cycle(world);
    expect(world.runtime.runnerOf(id).interrupts).toBe(0);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "waiting", interruptRequestedAt: null });
    expect((await messagesOf(world, id)).filter((message) => message.role === "system")).toEqual([]);
  });

  it("V-25c closes the runtime, ends the session and captures the Markdown the skill edited", async () => {
    const holder = { clone: "" };
    const skill = { hook_event_name: "PostToolUse", tool_name: "Skill", tool_input: { skill: "flow-dev:spec-writer" } };
    const edit = () => ({ hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: join(holder.clone, SPEC_PATH) } });
    const world = await workerWorld({ script: () => [{ kind: "hook", payload: skill }, { kind: "hook", payload: edit() }] }, { permissions: undefined });
    holder.clone = world.clone;
    await mkdir(dirname(join(world.clone, SPEC_PATH)), { recursive: true });
    await writeFile(join(world.clone, SPEC_PATH), "# Spec x\n");
    const id = await world.open();
    await cycle(world);
    await world.harness.caller.session.end(scopeOf(world, id));
    await cycle(world);
    expect(world.runtime.runnerOf(id).closed).toBe(true);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "ended", endRequestedAt: null });
    const [artifact] = await world.setup.database.select().from(taskArtifacts);
    expect(artifact).toMatchObject({ relativePath: SPEC_PATH, latestVersion: 1 });
    const [version] = await world.setup.database.select().from(taskArtifactVersions);
    expect(version).toMatchObject({ content: "# Spec x\n", skill: "spec-writer", trigger: "session_end" });
  });

  it("cancels the pending requests when the session is ended", async () => {
    const world = await brokerWorld([{ kind: "ask", questions: QUESTION }]);
    const id = await world.open();
    await cycle(world);
    await world.harness.caller.session.end(scopeOf(world, id));
    await cycle(world);
    expect((await requestsOf(world.setup, id)).map((request) => request.status)).toEqual(["cancelled"]);
    expect(world.runtime.runnerOf(id).outcomes).toEqual([{ behavior: "deny", message: "Interrompido pela pessoa" }]);
    expect((await sessionRowOf(world.setup, id)).status).toBe("ended");
  });
});
